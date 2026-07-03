import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { reorderCategoriesForProfile } from "@/lib/categories";

// 로그인 사용자가 팀 공유 카테고리를 '자신만의' 순서로 재배치한다.
// 전역 categories 는 건드리지 않고 profile_category_order 에만 저장 → 본인 화면에만 반영.
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
    await reorderCategoriesForProfile(pid, ids);
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
