import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { hideSharedBookmark, unhideSharedBookmark } from "@/lib/hiddenShared";

async function readBookmarkId(request: Request): Promise<number | null> {
  const body = await request.json().catch(() => null);
  const id = Number(body?.bookmarkId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// 팀 공유 즐겨찾기를 내 보드에서 숨기기
export async function POST(request: Request) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const bookmarkId = await readBookmarkId(request);
  if (!bookmarkId) return NextResponse.json({ error: "bookmarkId required" }, { status: 400 });
  try {
    await hideSharedBookmark(pid, bookmarkId);
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// 숨긴 팀 공유 즐겨찾기를 다시 보이게 복원
export async function DELETE(request: Request) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const bookmarkId = await readBookmarkId(request);
  if (!bookmarkId) return NextResponse.json({ error: "bookmarkId required" }, { status: 400 });
  try {
    await unhideSharedBookmark(pid, bookmarkId);
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
