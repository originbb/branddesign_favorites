import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { createPersonalBookmark } from "@/lib/personalBookmarks";
import { normalizeUrl, faviconUrl } from "@/lib/validation";

export async function POST(request: Request) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
  let created;
  try {
    created = await createPersonalBookmark(pid, {
      title, url, description, faviconUrl: faviconUrl(url), categoryId,
    });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json(created, { status: 201 });
}
