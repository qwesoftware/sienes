import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic redirect only: a missing session cookie sends the visitor to
// sign-in. A cookie that is present may still be stale (for example after
// the account was disabled); every page and route handler verifies the
// session itself, and the sign-in page handles a stale cookie by showing
// the form again.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/sign-in") return NextResponse.next();
  if (!getSessionCookie(request)) return NextResponse.redirect(new URL("/sign-in", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};
