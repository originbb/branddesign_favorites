import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";

// 세션 유효기간(초). 로그인 쿠키의 maxAge와 서명 payload의 exp에 함께 사용한다.
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30일

// 세션 서명 키. 관리자 토큰과 분리하기 위해 SESSION_SECRET 을 우선 사용하고,
// (아직 설정 전인 배포 호환을 위해) 없으면 ADMIN_TOKEN 으로 폴백한다.
// 운영에서는 반드시 SESSION_SECRET 을 별도로 설정할 것.
function key(): string {
  const k = process.env.SESSION_SECRET || process.env.ADMIN_TOKEN;
  if (!k) throw new Error("SESSION_SECRET (or ADMIN_TOKEN) is not set");
  return k;
}

const mac = (payload: string) => createHmac("sha256", key()).update(payload).digest("hex");

// payload = `${id}.${exp}` 형태. exp 는 만료 시각(초 단위 epoch).
export function signProfile(id: number, nowMs: number = Date.now()): string {
  const exp = Math.floor(nowMs / 1000) + SESSION_MAX_AGE;
  const payload = `${id}.${exp}`;
  return `${payload}.${mac(payload)}`;
}

export function verifyProfile(
  cookie: string | undefined | null,
  nowMs: number = Date.now(),
): number | null {
  if (!cookie) return null;
  const parts = cookie.split(".");
  if (parts.length !== 3) return null;
  const [idStr, expStr, sig] = parts;
  // 엄격한 정수 형태만 허용(선행 0/공백/16진수/부호 등 정규화 불일치 차단)
  if (!/^[1-9]\d*$/.test(idStr) || !/^[1-9]\d*$/.test(expStr) || !sig) return null;

  const payload = `${idStr}.${expStr}`;
  const expected = Buffer.from(mac(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;

  // 만료 확인
  if (Number(expStr) * 1000 < nowMs) return null;
  return Number(idStr);
}

export async function currentProfileId(): Promise<number | null> {
  const store = await cookies();
  return verifyProfile(store.get(PROFILE_COOKIE)?.value);
}
