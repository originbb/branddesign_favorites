import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { listPersonalCategories, createPersonalCategory } from "@/lib/personalCategories";

export async function GET() {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await listPersonalCategories(pid));
}

export async function POST(request: Request) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (name.length > 20) {
    return NextResponse.json({ error: "카테고리 이름은 20자 이내여야 합니다." }, { status: 400 });
  }
  return NextResponse.json(await createPersonalCategory(pid, name), { status: 201 });
}
