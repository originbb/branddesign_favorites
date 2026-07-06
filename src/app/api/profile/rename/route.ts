import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { renameProfile } from "@/lib/profiles";
import { verifyPin } from "@/lib/pin";
import { validPin, validName } from "@/lib/validation";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  const profileId = await currentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const currentPin = typeof body?.currentPin === "string" ? body.currentPin : "";
  const rawName = typeof body?.name === "string" ? body.name : "";

  if (!validPin(currentPin)) {
    return NextResponse.json(
      { error: "PIN은 4자리 숫자여야 합니다." },
      { status: 400 },
    );
  }

  const name = validName(rawName);
  if (!name) {
    return NextResponse.json(
      { error: "이름은 1~20자여야 합니다." },
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

  const result = await renameProfile(profileId, name);
  if (result === "conflict") {
    return NextResponse.json({ error: "이미 사용 중인 이름입니다." }, { status: 409 });
  }
  if (result === "notfound") {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, name });
}
