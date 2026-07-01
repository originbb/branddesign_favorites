import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { resetPin } from "@/lib/profiles";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const profileId = typeof body?.profileId === "number" ? body.profileId : null;

  if (!profileId) {
    return NextResponse.json(
      { error: "프로필 ID를 입력해주세요." },
      { status: 400 },
    );
  }

  const ok = await resetPin(profileId);
  if (!ok) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
