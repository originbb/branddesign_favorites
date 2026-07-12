import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, PROFILE_COOKIE } from "@/lib/cookies";

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
  let response = NextResponse.next();

  if (pathname === "/manage" && searchParams.has("key")) {
    const provided = searchParams.get("key") ?? "";
    const expected = process.env.ADMIN_TOKEN ?? "";
    const url = request.nextUrl.clone();
    url.searchParams.delete("key");
    response = NextResponse.redirect(url);

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

  // CSRF 보호 (상태를 변경하는 API 요청)
  const isApi = pathname.startsWith('/api/');
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
  
  if (isApi && isStateChanging) {
    const cookieToken = request.cookies.get('csrf_token')?.value;
    const headerToken = request.headers.get('x-csrf-token');
    
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return NextResponse.json({ error: 'CSRF token mismatch or missing' }, { status: 403 });
    }
  }

  // 로그인 사용자가 루트 경로(/)에 접근하면 내부적으로 /my-board 로 Rewrite
  if (pathname === "/" && request.cookies.has(PROFILE_COOKIE)) {
    response = NextResponse.rewrite(new URL("/my-board", request.url));
  }

  // 모든 브라우저 요청(페이지, API 등)에 대해 csrf_token 쿠키 발급
  if (!request.cookies.has('csrf_token')) {
    response.cookies.set('csrf_token', crypto.randomUUID(), {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // 클라이언트에서 읽어야 함
    });
  }

  return response;
}

export const config = {
  // 정적 에셋을 제외한 모든 경로에서 실행 → 첫 페이지 로드 때 csrf_token 쿠키가 발급되어야
  // 이후 로그인 등 상태변경 POST의 CSRF 검증이 통과된다. (/manage·/api 로직은 내부 분기로 처리)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|fonts/).*)"],
};
