import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { updatePersonalCategory, deletePersonalCategory } from "@/lib/personalCategories";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (name.length > 20) {
    return NextResponse.json({ error: "카테고리 이름은 20자 이내여야 합니다." }, { status: 400 });
  }
  const ok = await updatePersonalCategory(pid, numId, name);
  if (!ok) return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const ok = await deletePersonalCategory(pid, numId);
  if (!ok) return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
