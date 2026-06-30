import { describe, it, expect } from "vitest";
import { filterBookmarks } from "@/lib/search";
import type { Bookmark } from "@/lib/types";

const make = (over: Partial<Bookmark>): Bookmark => ({
  id: 1, title: "T", url: "https://x.com", description: null,
  faviconUrl: null, categoryId: null, sortOrder: 0, createdAt: "", ...over,
});

const items: Bookmark[] = [
  make({ id: 1, title: "Figma", url: "https://figma.com", description: "디자인 툴" }),
  make({ id: 2, title: "GitHub", url: "https://github.com", description: "코드 저장소" }),
  make({ id: 3, title: "Notion", url: "https://notion.so", description: "문서" }),
];

describe("filterBookmarks", () => {
  it("returns all when query is blank", () => {
    expect(filterBookmarks(items, "   ")).toHaveLength(3);
  });
  it("matches by title case-insensitively", () => {
    expect(filterBookmarks(items, "figma").map((b) => b.id)).toEqual([1]);
  });
  it("matches by description", () => {
    expect(filterBookmarks(items, "코드").map((b) => b.id)).toEqual([2]);
  });
  it("matches by url", () => {
    expect(filterBookmarks(items, "notion.so").map((b) => b.id)).toEqual([3]);
  });
  it("returns empty when nothing matches", () => {
    expect(filterBookmarks(items, "zzz")).toHaveLength(0);
  });
});
