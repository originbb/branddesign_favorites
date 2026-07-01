import { describe, it, expect } from "vitest";
import { normalizeUrl, faviconUrl, domainOf } from "@/lib/validation";

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
