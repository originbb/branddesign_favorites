import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { reorderPersonalCategories } from "@/lib/personalCategories";

export async function POST(request: Request) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : null;
  if (!ids) return NextResponse.json({ error: "ids required" }, { status: 400 });
  if (ids.some((v: number) => !Number.isInteger(v) || v <= 0)) {
    return NextResponse.json({ error: "ids must be positive integers" }, { status: 400 });
  }

  try {
    await reorderPersonalCategories(pid, ids);
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
