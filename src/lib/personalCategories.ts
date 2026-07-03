import { sql } from "@/lib/db";
import type { Category } from "@/lib/types";

type Row = { id: number; name: string; sort_order: number };
const map = (r: Row): Category => ({ id: r.id, name: r.name, sortOrder: r.sort_order });

export async function listPersonalCategories(profileId: number): Promise<Category[]> {
  const rows = (await sql`
    SELECT id, name, sort_order FROM personal_categories
    WHERE profile_id = ${profileId}
    ORDER BY sort_order ASC, id ASC
  `) as Row[];
  return rows.map(map);
}

export async function createPersonalCategory(
  profileId: number, name: string,
): Promise<Category> {
  const rows = (await sql`
    INSERT INTO personal_categories (profile_id, name, sort_order)
    VALUES (
      ${profileId}, ${name},
      COALESCE((SELECT MAX(sort_order) + 1 FROM personal_categories WHERE profile_id = ${profileId}), 0)
    )
    RETURNING id, name, sort_order
  `) as Row[];
  return map(rows[0]);
}

export async function updatePersonalCategory(
  profileId: number, id: number, name: string,
): Promise<boolean> {
  const rows = (await sql`
    UPDATE personal_categories SET name = ${name}
    WHERE id = ${id} AND profile_id = ${profileId}
    RETURNING id
  `) as { id: number }[];
  return rows.length > 0;
}

export async function deletePersonalCategory(
  profileId: number, id: number,
): Promise<boolean> {
  const rows = (await sql`
    DELETE FROM personal_categories
    WHERE id = ${id} AND profile_id = ${profileId}
    RETURNING id
  `) as { id: number }[];
  return rows.length > 0;
}

// 개인 카테고리 순서 변경. 소유권 보호를 위해 profile_id 조건을 함께 건다
// (남의 카테고리 id를 섞어 보내도 그 행은 갱신되지 않음).
export async function reorderPersonalCategories(
  profileId: number, ids: number[],
): Promise<void> {
  if (ids.length === 0) return;
  await sql.transaction(
    ids.map((id, i) =>
      sql`UPDATE personal_categories SET sort_order = ${i} WHERE id = ${id} AND profile_id = ${profileId}`,
    ),
  );
}
