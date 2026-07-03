import { sql } from "@/lib/db";

// 개인 모드에서 팀 공유 즐겨찾기를 '내 화면에서만' 숨기기 위한 프로필별 목록.
// 팀 공용 bookmarks 테이블은 절대 건드리지 않는다.

export async function listHiddenSharedIds(profileId: number): Promise<number[]> {
  try {
    const rows = (await sql`
      SELECT bookmark_id FROM personal_hidden_shared WHERE profile_id = ${profileId}
    `) as { bookmark_id: number }[];
    return rows.map((r) => r.bookmark_id);
  } catch {
    // 마이그레이션 전이라 테이블이 없거나 일시적 오류 → 숨김 없음으로 폴백
    return [];
  }
}

export async function hideSharedBookmark(profileId: number, bookmarkId: number): Promise<void> {
  await sql`
    INSERT INTO personal_hidden_shared (profile_id, bookmark_id)
    VALUES (${profileId}, ${bookmarkId})
    ON CONFLICT (profile_id, bookmark_id) DO NOTHING
  `;
}

export async function unhideSharedBookmark(profileId: number, bookmarkId: number): Promise<void> {
  await sql`
    DELETE FROM personal_hidden_shared
    WHERE profile_id = ${profileId} AND bookmark_id = ${bookmarkId}
  `;
}
