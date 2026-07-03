import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { saveUnifiedCategoryOrder } from "@/lib/categoryOrder";

export async function POST(request: Request) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items) return NextResponse.json({ error: "items required" }, { status: 400 });
  for (const item of items) {
    if (!['s', 'p'].includes(item.kind) || !Number.isInteger(item.id) || item.id <= 0) {
      return NextResponse.json({ error: "invalid item" }, { status: 400 });
    }
  }

  try {
    await saveUnifiedCategoryOrder(pid, items);
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
