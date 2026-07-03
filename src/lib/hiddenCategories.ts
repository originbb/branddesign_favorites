import { sql } from "@/lib/db";

// 개인 모드에서 팀 공유 카테고리를 '내 화면에서만' 숨기기 위한 프로필별 목록.
// 팀 공용 categories 테이블은 절대 건드리지 않는다.

export async function listHiddenCategoryIds(profileId: number): Promise<number[]> {
  try {
    const rows = (await sql`
      SELECT category_id FROM personal_hidden_categories WHERE profile_id = ${profileId}
    `) as { category_id: number }[];
    return rows.map((r) => r.category_id);
  } catch {
    // 마이그레이션 전이라 테이블이 없거나 일시적 오류 → 숨김 없음으로 폴백
    return [];
  }
}

export async function hideCategory(profileId: number, categoryId: number): Promise<void> {
  await sql`
    INSERT INTO personal_hidden_categories (profile_id, category_id)
    VALUES (${profileId}, ${categoryId})
    ON CONFLICT (profile_id, category_id) DO NOTHING
  `;
}

export async function unhideCategory(profileId: number, categoryId: number): Promise<void> {
  await sql`
    DELETE FROM personal_hidden_categories
    WHERE profile_id = ${profileId} AND category_id = ${categoryId}
  `;
}
