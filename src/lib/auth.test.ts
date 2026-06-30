import { describe, it, expect } from "vitest";
import { verifyToken } from "@/lib/auth";

describe("verifyToken", () => {
  it("returns true when provided matches expected", () => {
    expect(verifyToken("secret123", "secret123")).toBe(true);
  });
  it("returns false when provided differs", () => {
    expect(verifyToken("wrong", "secret123")).toBe(false);
  });
  it("returns false when provided is missing", () => {
    expect(verifyToken(undefined, "secret123")).toBe(false);
    expect(verifyToken(null, "secret123")).toBe(false);
    expect(verifyToken("", "secret123")).toBe(false);
  });
  it("returns false when expected is missing", () => {
    expect(verifyToken("anything", undefined)).toBe(false);
    expect(verifyToken("anything", "")).toBe(false);
  });
  it("returns false for different lengths without throwing", () => {
    expect(verifyToken("short", "muchlongertoken")).toBe(false);
  });
});
