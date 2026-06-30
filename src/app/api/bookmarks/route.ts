import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listBookmarks, createBookmark } from "@/lib/bookmarks";
import { normalizeUrl, faviconUrl } from "@/lib/validation";

export async function GET() {
  return NextResponse.json(await listBookmarks());
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
  const created = await createBookmark({
    title, url, description, faviconUrl: faviconUrl(url), categoryId,
  });
  return NextResponse.json(created, { status: 201 });
}
