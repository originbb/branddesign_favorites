import { describe, it, expect } from "vitest";
import { orderCards, sharedKey, personalKey } from "@/lib/personalBoard";
import type { Bookmark, PersonalBookmark } from "@/lib/types";

const b = (id: number): Bookmark => ({
  id, title: `s${id}`, url: `https://s${id}.com`, description: null,
  faviconUrl: null, categoryId: null, sortOrder: id, createdAt: "2026-01-01",
});
const p = (id: number): PersonalBookmark => ({
  id, title: `p${id}`, url: `https://p${id}.com`, description: null,
  faviconUrl: null, categoryId: null, createdAt: "2026-01-01",
});

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
