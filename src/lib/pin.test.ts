import { describe, it, expect } from "vitest";
import { hashPin, verifyPin } from "@/lib/pin";

describe("pin hashing", () => {
  it("verifies a correct pin round-trip", () => {
    const stored = hashPin("1234");
    expect(verifyPin("1234", stored)).toBe(true);
  });
  it("rejects an incorrect pin", () => {
    const stored = hashPin("1234");
    expect(verifyPin("0000", stored)).toBe(false);
  });
  it("produces different salts each call", () => {
    expect(hashPin("1234")).not.toBe(hashPin("1234"));
  });
  it("returns false for malformed stored value", () => {
    expect(verifyPin("1234", "garbage")).toBe(false);
    expect(verifyPin("1234", "")).toBe(false);
  });
});
