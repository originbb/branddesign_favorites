import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";
import { validName, validPin } from "@/lib/validation";
import { hashPin, verifyPin } from "@/lib/pin";
import { signProfile, SESSION_MAX_AGE } from "@/lib/session";
import { findByNameKey, createProfile } from "@/lib/profiles";
import { hitRateLimit, checkLock, recordFailure, clearFailures } from "@/lib/loginGuard";

const tooMany = (retryAfterSec: number, msg: string) =>
  NextResponse.json({ error: msg }, {
    status: 429, headers: { "Retry-After": String(retryAfterSec) },
  });

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
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

  // 무차별 대입 방어(모든 인스턴스 공유 = Postgres). 서로 독립이라 동시에 조회.
  //  ① IP별 5분당 30회 제한 — 이름을 바꿔가며 하는 시도까지 차단
  //  ② 이름 계정 잠금 — 연속 실패 5회면 15분 잠금
  //  ③ 프로필 조회
  const [ipRl, lock, existing] = await Promise.all([
    hitRateLimit(`ip:${ip}`, 30, 5 * 60),
    checkLock(nameKey),
    findByNameKey(nameKey),
  ]);

  if (lock.locked) {
    return tooMany(lock.retryAfterSec, "연속된 실패로 계정이 잠겼습니다. 잠시 후 다시 시도해주세요.");
  }
  if (!ipRl.ok) {
    return tooMany(ipRl.retryAfterSec, "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
  }

  // PIN 불일치 처리: 실패 기록 후 401
  const fail = async () => {
    await recordFailure(nameKey);
    return NextResponse.json({ error: "PIN이 일치하지 않습니다." }, { status: 401 });
  };

  let profileId: number;
  let mustChange = false;

  if (existing) {
    if (existing.pinHash.startsWith("MUST_CHANGE:")) {
      const realHash = existing.pinHash.slice("MUST_CHANGE:".length);
      if (!verifyPin(pin, realHash)) return fail();
      mustChange = true;
      profileId = existing.id;
    } else if (!verifyPin(pin, existing.pinHash)) {
      return fail();
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
        if (!verifyPin(pin, realHash)) return fail();
        mustChange = true;
        profileId = retry.id;
      } else if (!verifyPin(pin, retry.pinHash)) {
        return fail();
      } else {
        profileId = retry.id;
      }
    }
  }

  // 인증 성공 → 해당 이름의 실패 카운트/잠금 해제
  await clearFailures(nameKey);

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
