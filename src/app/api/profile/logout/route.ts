import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";

export async function POST() {
  const store = await cookies();
  store.delete(PROFILE_COOKIE);
  return NextResponse.json({ ok: true });
}
