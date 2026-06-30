import { describe, it, expect } from "vitest";
import { normalizeUrl, faviconUrl } from "@/lib/validation";

describe("normalizeUrl", () => {
  it("keeps a valid https url", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
  });
  it("adds https:// when scheme is missing", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
  });
  it("trims whitespace", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com/");
  });
  it("rejects empty input", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });
  it("rejects non-http schemes", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("ftp://x.com")).toBeNull();
  });
});

describe("faviconUrl", () => {
  it("builds a google favicon url for a valid host", () => {
    expect(faviconUrl("https://example.com/")).toBe(
      "https://www.google.com/s2/favicons?domain=example.com&sz=64",
    );
  });
  it("returns null for invalid url", () => {
    expect(faviconUrl("not a url")).toBeNull();
  });
});
