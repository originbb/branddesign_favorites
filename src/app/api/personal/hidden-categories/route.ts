import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { hideCategory, unhideCategory } from "@/lib/hiddenCategories";

async function readCategoryId(request: Request): Promise<number | null> {
  const body = await request.json().catch(() => null);
  const id = Number(body?.categoryId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// 팀 공유 카테고리를 내 보드에서 숨기기 (탭 + 그 안의 공유 즐겨찾기 함께)
export async function POST(request: Request) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const categoryId = await readCategoryId(request);
  if (!categoryId) return NextResponse.json({ error: "categoryId required" }, { status: 400 });
  try {
    await hideCategory(pid, categoryId);
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// 숨긴 팀 공유 카테고리를 다시 보이게 복원
export async function DELETE(request: Request) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const categoryId = await readCategoryId(request);
  if (!categoryId) return NextResponse.json({ error: "categoryId required" }, { status: 400 });
  try {
    await unhideCategory(pid, categoryId);
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
