import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";

function key(): string {
  const k = process.env.ADMIN_TOKEN;
  if (!k) throw new Error("ADMIN_TOKEN is not set");
  return k;
}

const mac = (id: number) => createHmac("sha256", key()).update(String(id)).digest("hex");

export function signProfile(id: number): string {
  return `${id}.${mac(id)}`;
}

export function verifyProfile(cookie: string | undefined | null): number | null {
  if (!cookie) return null;
  const dot = cookie.lastIndexOf(".");
  if (dot < 0) return null;
  const id = Number(cookie.slice(0, dot));
  const sig = cookie.slice(dot + 1);
  if (!Number.isInteger(id) || id <= 0 || !sig) return null;
  const expected = Buffer.from(mac(id));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length) return null;
  return timingSafeEqual(expected, actual) ? id : null;
}

export async function currentProfileId(): Promise<number | null> {
  const store = await cookies();
  return verifyProfile(store.get(PROFILE_COOKIE)?.value);
}
