import { describe, it, expect, beforeAll } from "vitest";
import { signProfile, verifyProfile } from "@/lib/session";

beforeAll(() => {
  process.env.ADMIN_TOKEN = "test-secret-token";
});

describe("profile session token", () => {
  it("verifies a signed id round-trip", () => {
    const token = signProfile(42);
    expect(verifyProfile(token)).toBe(42);
  });
  it("rejects a tampered signature", () => {
    const token = signProfile(42);
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(verifyProfile(tampered)).toBeNull();
  });
  it("rejects a swapped id", () => {
    const token = signProfile(42);
    const sig = token.slice(token.lastIndexOf(".") + 1);
    expect(verifyProfile(`43.${sig}`)).toBeNull();
  });
  it("rejects malformed / empty input", () => {
    expect(verifyProfile(undefined)).toBeNull();
    expect(verifyProfile(null)).toBeNull();
    expect(verifyProfile("")).toBeNull();
    expect(verifyProfile("nodot")).toBeNull();
    expect(verifyProfile("abc.def")).toBeNull();
  });
});
