import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { updatePersonalBookmark, deletePersonalBookmark } from "@/lib/personalBookmarks";
import { normalizeUrl, faviconUrl } from "@/lib/validation";

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
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const url = normalizeUrl(typeof body?.url === "string" ? body.url : "");
  if (!title || !url) {
    return NextResponse.json({ error: "title and valid url required" }, { status: 400 });
  }
  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const categoryId =
    body?.categoryId === null || body?.categoryId === undefined ? null : Number(body.categoryId);
  if (categoryId !== null && !Number.isFinite(categoryId)) {
    return NextResponse.json({ error: "categoryId must be a number" }, { status: 400 });
  }
  const personalCategoryId =
    body?.personalCategoryId === null || body?.personalCategoryId === undefined
      ? null : Number(body.personalCategoryId);
  if (personalCategoryId !== null && !Number.isFinite(personalCategoryId)) {
    return NextResponse.json({ error: "personalCategoryId must be a number" }, { status: 400 });
  }
  try {
    await updatePersonalBookmark(pid, numId, {
      title, url, description, faviconUrl: faviconUrl(url), categoryId, personalCategoryId,
    });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
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
  try {
    await deletePersonalBookmark(pid, numId);
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
