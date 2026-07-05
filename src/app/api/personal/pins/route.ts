import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { setPinnedKeys } from "@/lib/profiles";

const KEY = /^[sp]\d+$/;

export async function POST(request: Request) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const keys = Array.isArray(body?.keys) ? (body.keys as unknown[]) : null;
  if (!keys || !keys.every((k) => typeof k === "string" && KEY.test(k))) {
    return NextResponse.json({ error: "keys must be s#/p# strings" }, { status: 400 });
  }
  try {
    await setPinnedKeys(pid, keys as string[]);
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
