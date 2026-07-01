import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { setOrderKeys } from "@/lib/profiles";

const KEY = /^[sp]\d+$/;

export async function POST(request: Request) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const keys = Array.isArray(body?.keys) ? (body.keys as unknown[]) : null;
  if (!keys || !keys.every((k) => typeof k === "string" && KEY.test(k))) {
    return NextResponse.json({ error: "keys must be s#/p# strings" }, { status: 400 });
  }
  await setOrderKeys(pid, keys as string[]);
  return NextResponse.json({ ok: true });
}
