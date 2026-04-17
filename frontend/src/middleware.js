import { NextResponse } from "next/server"

/**
 * Middleware — route-level auth protection.
 *
 * Runs on the edge before any page renders, preventing the
 * client-side flash that occurs with useEffect-based guards.
 *
 * Protected routes:
 *   /developer/*  — requires access_token cookie (any authenticated user)
 *                   Full role check (developer role) is still enforced
 *                   by the layout's usePermissions guard after hydration.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl

  // ── Developer portal ──────────────────────────────────────────
  if (pathname.startsWith("/developer")) {
    const token = request.cookies.get("access_token")?.value

    if (!token) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/developer/:path*"],
}
