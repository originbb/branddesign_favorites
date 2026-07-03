import { sql } from "@/lib/db";
import type { Category } from "@/lib/types";

type Row = { id: number; name: string; sort_order: number };
const map = (r: Row): Category => ({ id: r.id, name: r.name, sortOrder: r.sort_order });

export async function listCategories(): Promise<Category[]> {
  const rows = (await sql`
    SELECT id, name, sort_order FROM categories ORDER BY sort_order ASC, id ASC
  `) as Row[];
  return rows.map(map);
}

export async function createCategory(name: string): Promise<Category> {
  const rows = (await sql`
    INSERT INTO categories (name, sort_order)
    VALUES (${name}, COALESCE((SELECT MAX(sort_order) + 1 FROM categories), 0))
    RETURNING id, name, sort_order
  `) as Row[];
  return map(rows[0]);
}

export async function updateCategory(id: number, name: string): Promise<void> {
  await sql`UPDATE categories SET name = ${name} WHERE id = ${id}`;
}

export async function deleteCategory(id: number): Promise<void> {
  await sql`DELETE FROM categories WHERE id = ${id}`;
}

export async function reorderCategories(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await sql.transaction(
    ids.map((id, i) => sql`UPDATE categories SET sort_order = ${i} WHERE id = ${id}`),
  );
}

// 로그인 사용자용: 팀 공유 카테고리를 '이 사용자만의' 순서로 정렬해 반환.
// profile_category_order 에 저장된 개인 순서를 우선 적용하고, 아직 순서를 정하지 않은
// (관리자가 새로 추가한) 카테고리는 전역 sort_order 뒤쪽으로 이어 붙인다.
export async function listCategoriesForProfile(profileId: number): Promise<Category[]> {
  const rows = (await sql`
    SELECT c.id, c.name, c.sort_order
    FROM categories c
    LEFT JOIN profile_category_order o
      ON o.category_id = c.id AND o.profile_id = ${profileId}
    ORDER BY COALESCE(o.sort_order, 1000000 + c.sort_order) ASC, c.id ASC
  `) as Row[];
  return rows.map(map);
}

// 로그인 사용자가 팀 공유 카테고리를 자신만의 순서로 재배치. 다른 팀원에겐 영향 없음.
// 전송된 전체 순서를 개인 오버라이드 테이블에 upsert 한다.
export async function reorderCategoriesForProfile(
  profileId: number, ids: number[],
): Promise<void> {
  if (ids.length === 0) return;
  await sql.transaction(
    ids.map((id, i) => sql`
      INSERT INTO profile_category_order (profile_id, category_id, sort_order)
      VALUES (${profileId}, ${id}, ${i})
      ON CONFLICT (profile_id, category_id)
      DO UPDATE SET sort_order = ${i}
    `),
  );
}
