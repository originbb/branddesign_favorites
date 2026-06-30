import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { reorderCategories } from "@/lib/categories";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : null;
  if (!ids) return NextResponse.json({ error: "ids required" }, { status: 400 });
  await reorderCategories(ids);
  return NextResponse.json({ ok: true });
}
