import { describe, it, expect } from "vitest";
import { normalizeUrl, faviconUrl, domainOf, validName, validPin } from "@/lib/validation";

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
  it("builds a gstatic favicon url for a valid host", () => {
    expect(faviconUrl("https://example.com/")).toBe(
      "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://example.com&size=128",
    );
  });
  it("returns null for invalid url", () => {
    expect(faviconUrl("not a url")).toBeNull();
  });
});

describe("domainOf", () => {
  it("strips the www. prefix", () => {
    expect(domainOf("https://www.figma.com/files")).toBe("figma.com");
  });
  it("keeps a non-www subdomain", () => {
    expect(domainOf("https://sub.a.com/path")).toBe("sub.a.com");
  });
  it("returns the bare hostname", () => {
    expect(domainOf("https://example.com")).toBe("example.com");
  });
  it("returns the input unchanged when it is not a valid url", () => {
    expect(domainOf("not a url")).toBe("not a url");
  });
});

describe("validName", () => {
  it("trims and accepts 1-20 chars", () => {
    expect(validName("  Alice  ")).toBe("Alice");
    expect(validName("a")).toBe("a");
    expect(validName("12345678901234567890")).toBe("12345678901234567890");
  });
  it("rejects empty and too long", () => {
    expect(validName("   ")).toBeNull();
    expect(validName("")).toBeNull();
    expect(validName("123456789012345678901")).toBeNull();
  });
});

describe("validPin", () => {
  it("accepts exactly 4 digits", () => {
    expect(validPin("0000")).toBe(true);
    expect(validPin("1234")).toBe(true);
  });
  it("rejects non-4-digit", () => {
    expect(validPin("123")).toBe(false);
    expect(validPin("12345")).toBe(false);
    expect(validPin("12a4")).toBe(false);
    expect(validPin("")).toBe(false);
  });
});
