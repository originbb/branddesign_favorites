import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";
import { validName, validPin } from "@/lib/validation";
import { hashPin, verifyPin } from "@/lib/pin";
import { signProfile, SESSION_MAX_AGE } from "@/lib/session";
import { findByNameKey, createProfile } from "@/lib/profiles";
import { rateLimit, resetRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = validName(typeof body?.name === "string" ? body.name : "");
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!name || !validPin(pin)) {
    return NextResponse.json(
      { error: "이름(1-20자)과 4자리 PIN을 입력해주세요." },
      { status: 400 },
    );
  }

  const nameKey = name.toLowerCase();

  // 무차별 대입 방지 ①: IP별 5분당 30회 제한(이름을 바꿔가며 시도하는 것까지 차단).
  // x-forwarded-for 맨 앞 IP를 사용(Vercel이 신뢰 프록시로서 세팅).
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipRl = rateLimit(`login-ip:${ip}`, 30, 5 * 60 * 1000);
  if (!ipRl.ok) {
    return NextResponse.json(
      { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(ipRl.retryAfterSec) } },
    );
  }

  // 무차별 대입 방지 ②: 이름별 5분당 10회 제한
  const rlKey = `login:${nameKey}`;
  const rl = rateLimit(rlKey, 10, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let profileId: number;
  const existing = await findByNameKey(nameKey);
  let mustChange = false;

  if (existing) {
    if (existing.pinHash.startsWith("MUST_CHANGE:")) {
      const realHash = existing.pinHash.slice("MUST_CHANGE:".length);
      if (!verifyPin(pin, realHash)) {
        return NextResponse.json({ error: "PIN이 일치하지 않습니다." }, { status: 401 });
      }
      mustChange = true;
      profileId = existing.id;
    } else if (!verifyPin(pin, existing.pinHash)) {
      return NextResponse.json({ error: "PIN이 일치하지 않습니다." }, { status: 401 });
    } else {
      profileId = existing.id;
    }
  } else {
    try {
      const created = await createProfile(name, nameKey, hashPin(pin));
      profileId = created.id;
    } catch {
      // name_key UNIQUE 경합인지 확인: 재조회했을 때 row가 있으면 경합, 없으면 진짜 오류
      const retry = await findByNameKey(nameKey);
      if (!retry) {
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
      }
      if (retry.pinHash.startsWith("MUST_CHANGE:")) {
        const realHash = retry.pinHash.slice("MUST_CHANGE:".length);
        if (!verifyPin(pin, realHash)) {
          return NextResponse.json({ error: "PIN이 일치하지 않습니다." }, { status: 401 });
        }
        mustChange = true;
        profileId = retry.id;
      } else if (!verifyPin(pin, retry.pinHash)) {
        return NextResponse.json({ error: "PIN이 일치하지 않습니다." }, { status: 401 });
      } else {
        profileId = retry.id;
      }
    }
  }

  // 인증 성공 → 해당 이름의 시도 카운터 초기화
  resetRateLimit(rlKey);

  const store = await cookies();
  store.set(PROFILE_COOKIE, signProfile(profileId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return NextResponse.json({ id: profileId, name, pinReset: mustChange });
}
