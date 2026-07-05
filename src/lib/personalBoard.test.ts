import { describe, it, expect } from "vitest";
import { orderCards, buildSections, categoryKeyOf, sharedKey, personalKey } from "@/lib/personalBoard";
import type { Bookmark, PersonalBookmark, Category, UnifiedEntry } from "@/lib/types";

const b = (id: number): Bookmark => ({
  id, title: `s${id}`, url: `https://s${id}.com`, description: null,
  faviconUrl: null, categoryId: null, sortOrder: id, createdAt: "2026-01-01",
});
const p = (id: number): PersonalBookmark => ({
  id, title: `p${id}`, url: `https://p${id}.com`, description: null,
  faviconUrl: null, categoryId: null, personalCategoryId: null, createdAt: "2026-01-01",
});

// 카테고리가 지정된 카드 헬퍼
const cat = (id: number, name: string): Category => ({ id, name, sortOrder: 0 });
const bc = (id: number, categoryId: number | null): Bookmark => ({ ...b(id), categoryId });
const pc = (
  id: number, personalCategoryId: number | null, categoryId: number | null = null,
): PersonalBookmark => ({ ...p(id), personalCategoryId, categoryId });

describe("orderCards", () => {
  it("keys are namespaced", () => {
    expect(sharedKey(3)).toBe("s3");
    expect(personalKey(3)).toBe("p3");
  });
  it("follows order_keys, mixing shared and personal", () => {
    const out = orderCards([b(1), b(2)], [p(9)], ["p9", "s2", "s1"]);
    expect(out.map((c) => c.key)).toEqual(["p9", "s2", "s1"]);
    expect(out[0].kind).toBe("personal");
    expect(out[1].kind).toBe("shared");
  });
  it("appends cards missing from order_keys at the end", () => {
    const out = orderCards([b(1), b(2)], [p(9)], ["s2"]);
    expect(out.map((c) => c.key)).toEqual(["s2", "s1", "p9"]);
  });
  it("drops order_keys whose card no longer exists", () => {
    const out = orderCards([b(1)], [], ["s99", "s1", "p42"]);
    expect(out.map((c) => c.key)).toEqual(["s1"]);
  });
  it("ignores duplicate keys in order_keys", () => {
    const out = orderCards([b(1)], [], ["s1", "s1"]);
    expect(out.map((c) => c.key)).toEqual(["s1"]);
  });
});

describe("categoryKeyOf", () => {
  it("uses shared categoryId for shared cards", () => {
    expect(categoryKeyOf(orderCards([bc(1, 3)], [], ["s1"])[0])).toBe("s3");
  });
  it("prefers personalCategoryId for personal cards", () => {
    expect(categoryKeyOf(orderCards([], [pc(9, 5)], ["p9"])[0])).toBe("p5");
  });
  it("falls back to categoryId when personal card has no personal category", () => {
    expect(categoryKeyOf(orderCards([], [pc(9, null, 7)], ["p9"])[0])).toBe("s7");
  });
  it("returns 'none' when the card has no category", () => {
    expect(categoryKeyOf(orderCards([bc(1, null)], [], ["s1"])[0])).toBe("none");
  });
});

describe("buildSections", () => {
  const design = cat(1, "디자인");
  const dev = cat(2, "개발");
  const mine = cat(5, "내꺼");
  const unified: UnifiedEntry[] = [
    { kind: "s", cat: design },
    { kind: "s", cat: dev },
    { kind: "p", cat: mine },
  ];

  it("groups cards by unified order, preserving order_keys order within a group", () => {
    // order_keys: s1(dev), s2(design), s3(design)
    const cards = orderCards([bc(1, 2), bc(2, 1), bc(3, 1)], [], ["s1", "s2", "s3"]);
    const { groups } = buildSections(cards, unified, []);
    // 디자인(id1) 블록이 개발(id2)보다 먼저, 빈 개인 카테고리(p5)는 생략
    expect(groups.map((g) => g.key)).toEqual(["s1", "s2"]);
    expect(groups[0].label).toBe("디자인");
    expect(groups[0].cards.map((c) => c.key)).toEqual(["s2", "s3"]);
    expect(groups[1].cards.map((c) => c.key)).toEqual(["s1"]);
  });

  it("extracts pinned cards in pin order and removes them from category groups", () => {
    const cards = orderCards([bc(1, 1), bc(2, 1), bc(3, 2)], [], ["s1", "s2", "s3"]);
    const { pinned, groups } = buildSections(cards, unified, ["s3", "s1"]);
    expect(pinned.map((c) => c.key)).toEqual(["s3", "s1"]);
    // s1 은 고정되어 디자인 블록에서 빠지고 s2 만 남음
    expect(groups.find((g) => g.key === "s1")?.cards.map((c) => c.key)).toEqual(["s2"]);
    // 개발 블록의 유일 카드 s3 가 고정되어 블록 자체가 생략됨
    expect(groups.find((g) => g.key === "s2")).toBeUndefined();
  });

  it("puts uncategorized and orphaned cards in a trailing 'none' group", () => {
    // s1: 카테고리 없음, s2: unified 에 없는 카테고리(99)
    const cards = orderCards([bc(1, null), bc(2, 99)], [], ["s1", "s2"]);
    const { groups } = buildSections(cards, unified, []);
    const last = groups[groups.length - 1];
    expect(last.key).toBe("none");
    expect(last.label).toBeNull();
    expect(last.cards.map((c) => c.key)).toEqual(["s1", "s2"]);
  });

  it("ignores pinned keys that have no matching card", () => {
    const cards = orderCards([bc(1, 1)], [], ["s1"]);
    const { pinned } = buildSections(cards, unified, ["s99", "s1"]);
    expect(pinned.map((c) => c.key)).toEqual(["s1"]);
  });
});
