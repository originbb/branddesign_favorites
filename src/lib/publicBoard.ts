import type { Bookmark, Category } from "@/lib/types";

export type BookmarkGroup = { key: string; label: string | null; bookmarks: Bookmark[] };

/** 공개(기본) 보드용: 북마크를 카테고리(sort_order 순)로 그룹핑한다.
 *  - 그룹 순서는 categories 배열 순서(=탭 순서)를 따른다.
 *  - 그룹 안은 기존 북마크 순서 유지.
 *  - 카테고리가 없거나 목록에 없는 북마크는 맨 뒤 "none"(label=null) 그룹.
 *  - 카드가 없는 카테고리 그룹은 생략한다. */
export function groupBookmarksByCategory(
  bookmarks: Bookmark[],
  categories: Category[],
): BookmarkGroup[] {
  const groups: BookmarkGroup[] = [];
  const used = new Set<number>();
  for (const c of categories) {
    const items = bookmarks.filter((b) => b.categoryId === c.id);
    if (items.length > 0) {
      groups.push({ key: `s${c.id}`, label: c.name, bookmarks: items });
      items.forEach((b) => used.add(b.id));
    }
  }
  const leftover = bookmarks.filter((b) => !used.has(b.id));
  if (leftover.length > 0) groups.push({ key: "none", label: null, bookmarks: leftover });
  return groups;
}
