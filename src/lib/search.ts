import type { Bookmark } from "@/lib/types";

export function filterBookmarks(items: Bookmark[], query: string): Bookmark[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((b) => {
    const haystack = `${b.title} ${b.description ?? ""} ${b.url}`.toLowerCase();
    return haystack.includes(q);
  });
}
