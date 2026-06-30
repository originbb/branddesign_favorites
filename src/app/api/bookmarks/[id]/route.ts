import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { updateBookmark, deleteBookmark } from "@/lib/bookmarks";
import { normalizeUrl, faviconUrl } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
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
    body?.categoryId === null || body?.categoryId === undefined
      ? null
      : Number(body.categoryId);
  if (categoryId !== null && !Number.isFinite(categoryId)) {
    return NextResponse.json({ error: "categoryId must be a number" }, { status: 400 });
  }
  await updateBookmark(numId, {
    title, url, description, faviconUrl: faviconUrl(url), categoryId,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  await deleteBookmark(numId);
  return NextResponse.json({ ok: true });
}
