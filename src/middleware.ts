import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";

// /manage?key=TOKEN 로 들어오면 토큰을 쿠키에 저장하고 깔끔한 /manage 로 리다이렉트.
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/manage" && searchParams.has("key")) {
    const key = searchParams.get("key") ?? "";
    const url = request.nextUrl.clone();
    url.searchParams.delete("key");
    const response = NextResponse.redirect(url);
    response.cookies.set(ADMIN_COOKIE, key, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1년 유지
    });
    return response;
  }
  return NextResponse.next();
}

export const config = { matcher: ["/manage"] };
