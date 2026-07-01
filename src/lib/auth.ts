import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/cookies";
export { ADMIN_COOKIE };

// 상수 시간 문자열 비교
export function verifyToken(
  provided: string | undefined | null,
  expected: string | undefined,
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// 관리자 쿠키에 저장할 "서명값". 원문 ADMIN_TOKEN 을 쿠키에 넣지 않기 위해
// 세션 서명 키로 고정 메시지("admin:v1")를 HMAC 한 값을 사용한다.
// (middleware 의 Web Crypto 계산 결과와 반드시 동일해야 함)
export const ADMIN_COOKIE_MESSAGE = "admin:v1";

export function adminCookieToken(): string | null {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET || token;
  return createHmac("sha256", secret).update(ADMIN_COOKIE_MESSAGE).digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const got = store.get(ADMIN_COOKIE)?.value;
  const expected = adminCookieToken();
  return verifyToken(got, expected ?? undefined);
}
