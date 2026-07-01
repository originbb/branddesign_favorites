import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";
import { validName, validPin } from "@/lib/validation";
import { hashPin, verifyPin } from "@/lib/pin";
import { signProfile } from "@/lib/session";
import { findByNameKey, createProfile } from "@/lib/profiles";
import { sql } from "@/lib/db";

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
  let profileId: number;
  const existing = await findByNameKey(nameKey);
  if (existing) {
    // PIN이 'RESET' 상태면 → 새 PIN으로 교체
    if (existing.pinHash === "RESET") {
      const newHash = hashPin(pin);
      await sql`UPDATE profiles SET pin_hash = ${newHash} WHERE id = ${existing.id}`;
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
      if (retry.pinHash === "RESET") {
        const newHash = hashPin(pin);
        await sql`UPDATE profiles SET pin_hash = ${newHash} WHERE id = ${retry.id}`;
        profileId = retry.id;
      } else if (!verifyPin(pin, retry.pinHash)) {
        return NextResponse.json({ error: "PIN이 일치하지 않습니다." }, { status: 401 });
      } else {
        profileId = retry.id;
      }
    }
  }

  const store = await cookies();
  store.set(PROFILE_COOKIE, signProfile(profileId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ id: profileId, name, pinReset: existing?.pinHash === "RESET" });
}
