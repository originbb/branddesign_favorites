import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { getProfile } from "@/lib/profiles";
import { verifyPin, hashPin } from "@/lib/pin";
import { validPin } from "@/lib/validation";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  const profileId = await currentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const currentPin = typeof body?.currentPin === "string" ? body.currentPin : "";
  const newPin = typeof body?.newPin === "string" ? body.newPin : "";

  if (!validPin(currentPin) || !validPin(newPin)) {
    return NextResponse.json(
      { error: "PIN은 4자리 숫자여야 합니다." },
      { status: 400 },
    );
  }

  const rows = await sql`SELECT pin_hash FROM profiles WHERE id = ${profileId}`;
  const profile = rows[0] as { pin_hash: string } | undefined;
  if (!profile) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }

  let realHash = profile.pin_hash;
  if (realHash.startsWith("MUST_CHANGE:")) {
    realHash = realHash.slice("MUST_CHANGE:".length);
  }

  if (!verifyPin(currentPin, realHash)) {
    return NextResponse.json({ error: "현재 PIN이 일치하지 않습니다." }, { status: 401 });
  }

  const newHash = hashPin(newPin);
  await sql`UPDATE profiles SET pin_hash = ${newHash} WHERE id = ${profileId}`;

  return NextResponse.json({ success: true });
}
