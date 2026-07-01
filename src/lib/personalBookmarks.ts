import { sql } from "@/lib/db";
import type { PersonalBookmark } from "@/lib/types";

type Row = {
  id: number; title: string; url: string; description: string | null;
  favicon_url: string | null; category_id: number | null;
  personal_category_id: number | null; created_at: string;
};
const map = (r: Row): PersonalBookmark => ({
  id: r.id, title: r.title, url: r.url, description: r.description,
  faviconUrl: r.favicon_url, categoryId: r.category_id,
  personalCategoryId: r.personal_category_id, createdAt: r.created_at,
});

type Input = {
  title: string; url: string; description: string | null;
  faviconUrl: string | null; categoryId: number | null;
  personalCategoryId: number | null;
};

export async function listPersonalBookmarks(profileId: number): Promise<PersonalBookmark[]> {
  const rows = (await sql`
    SELECT id, title, url, description, favicon_url, category_id, personal_category_id, created_at
    FROM personal_bookmarks WHERE profile_id = ${profileId}
    ORDER BY created_at ASC, id ASC
  `) as Row[];
  return rows.map(map);
}

export async function createPersonalBookmark(
  profileId: number, input: Input,
): Promise<PersonalBookmark> {
  const rows = (await sql`
    INSERT INTO personal_bookmarks
      (profile_id, title, url, description, favicon_url, category_id, personal_category_id)
    VALUES (${profileId}, ${input.title}, ${input.url}, ${input.description},
            ${input.faviconUrl}, ${input.categoryId}, ${input.personalCategoryId})
    RETURNING id, title, url, description, favicon_url, category_id, personal_category_id, created_at
  `) as Row[];
  return map(rows[0]);
}

export async function updatePersonalBookmark(
  profileId: number, id: number, input: Input,
): Promise<void> {
  await sql`
    UPDATE personal_bookmarks SET
      title = ${input.title}, url = ${input.url}, description = ${input.description},
      favicon_url = ${input.faviconUrl}, category_id = ${input.categoryId},
      personal_category_id = ${input.personalCategoryId}
    WHERE id = ${id} AND profile_id = ${profileId}
  `;
}

export async function deletePersonalBookmark(profileId: number, id: number): Promise<void> {
  await sql`DELETE FROM personal_bookmarks WHERE id = ${id} AND profile_id = ${profileId}`;
}
