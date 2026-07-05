import { describe, it, expect } from "vitest";
import { groupBookmarksByCategory } from "@/lib/publicBoard";
import type { Bookmark, Category } from "@/lib/types";

const cat = (id: number, name: string, sortOrder = 0): Category => ({ id, name, sortOrder });
const bm = (id: number, categoryId: number | null): Bookmark => ({
  id, title: `b${id}`, url: `https://b${id}.com`, description: null,
  faviconUrl: null, categoryId, sortOrder: id, createdAt: "2026-01-01",
});

describe("groupBookmarksByCategory", () => {
  const cats = [cat(1, "디자인"), cat(2, "개발")];

  it("groups by category order, preserving bookmark order within a group", () => {
    const out = groupBookmarksByCategory([bm(1, 2), bm(2, 1), bm(3, 1)], cats);
    expect(out.map((g) => g.key)).toEqual(["s1", "s2"]);
    expect(out[0].label).toBe("디자인");
    expect(out[0].bookmarks.map((b) => b.id)).toEqual([2, 3]);
    expect(out[1].bookmarks.map((b) => b.id)).toEqual([1]);
  });

  it("puts uncategorized and orphaned bookmarks in a trailing 'none' group", () => {
    const out = groupBookmarksByCategory([bm(1, null), bm(2, 99)], cats);
    const last = out[out.length - 1];
    expect(last.key).toBe("none");
    expect(last.label).toBeNull();
    expect(last.bookmarks.map((b) => b.id)).toEqual([1, 2]);
  });

  it("omits empty category groups", () => {
    const out = groupBookmarksByCategory([bm(1, 1)], cats);
    expect(out.map((g) => g.key)).toEqual(["s1"]);
  });
});
