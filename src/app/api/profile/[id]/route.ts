import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteProfile, renameProfile } from "@/lib/profiles";
import { validName } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const name = validName(typeof body?.name === "string" ? body.name : "");
  if (!name) {
    return NextResponse.json({ error: "이름은 1-20자여야 합니다." }, { status: 400 });
  }
  const result = await renameProfile(numId, name);
  if (result === "conflict") {
    return NextResponse.json({ error: "이미 같은 이름의 프로필이 있습니다." }, { status: 409 });
  }
  if (result === "notfound") {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, name });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const ok = await deleteProfile(numId);
  if (!ok) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
