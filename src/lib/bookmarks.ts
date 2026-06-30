import { sql } from "@/lib/db";
import type { Bookmark } from "@/lib/types";

type Row = {
  id: number; title: string; url: string; description: string | null;
  favicon_url: string | null; category_id: number | null;
  sort_order: number; created_at: string;
};
const map = (r: Row): Bookmark => ({
  id: r.id, title: r.title, url: r.url, description: r.description,
  faviconUrl: r.favicon_url, categoryId: r.category_id,
  sortOrder: r.sort_order, createdAt: r.created_at,
});

type Input = {
  title: string; url: string; description: string | null;
  faviconUrl: string | null; categoryId: number | null;
};

export async function listBookmarks(): Promise<Bookmark[]> {
  const rows = (await sql`
    SELECT id, title, url, description, favicon_url, category_id, sort_order, created_at
    FROM bookmarks ORDER BY sort_order ASC, id ASC
  `) as Row[];
  return rows.map(map);
}

export async function createBookmark(input: Input): Promise<Bookmark> {
  const rows = (await sql`
    INSERT INTO bookmarks (title, url, description, favicon_url, category_id, sort_order)
    VALUES (${input.title}, ${input.url}, ${input.description}, ${input.faviconUrl},
            ${input.categoryId}, COALESCE((SELECT MAX(sort_order) + 1 FROM bookmarks), 0))
    RETURNING id, title, url, description, favicon_url, category_id, sort_order, created_at
  `) as Row[];
  return map(rows[0]);
}

export async function updateBookmark(id: number, input: Input): Promise<void> {
  await sql`
    UPDATE bookmarks SET
      title = ${input.title}, url = ${input.url}, description = ${input.description},
      favicon_url = ${input.faviconUrl}, category_id = ${input.categoryId}
    WHERE id = ${id}
  `;
}

export async function deleteBookmark(id: number): Promise<void> {
  await sql`DELETE FROM bookmarks WHERE id = ${id}`;
}

export async function reorderBookmarks(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await sql.transaction(
    ids.map((id, i) => sql`UPDATE bookmarks SET sort_order = ${i} WHERE id = ${id}`),
  );
}
