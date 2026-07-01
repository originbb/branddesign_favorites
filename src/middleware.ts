import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/cookies";

const ADMIN_COOKIE_MESSAGE = "admin:v1";

// Edge 런타임(Web Crypto)로 관리자 쿠키 서명값 계산.
// auth.ts 의 adminCookieToken()(node:crypto) 결과와 동일한 hex 여야 한다.
async function adminCookieToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(ADMIN_COOKIE_MESSAGE));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// /manage?key=TOKEN 로 들어오면, 키가 올바를 때만 '서명된' 관리자 쿠키를 심고
// 깔끔한 /manage 로 리다이렉트한다. 원문 토큰은 쿠키에 저장하지 않는다.
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/manage" && searchParams.has("key")) {
    const provided = searchParams.get("key") ?? "";
    const expected = process.env.ADMIN_TOKEN ?? "";
    const url = request.nextUrl.clone();
    url.searchParams.delete("key");
    const response = NextResponse.redirect(url);

    if (expected && provided === expected) {
      const secret = process.env.SESSION_SECRET || expected;
      response.cookies.set(ADMIN_COOKIE, await adminCookieToken(secret), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30일
      });
    }
    return response;
  }
  return NextResponse.next();
}

export const config = { matcher: ["/manage"] };
