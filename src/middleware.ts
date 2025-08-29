import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ajusta los locales que uses
  const isAdmin =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/es/admin") ||
    pathname.startsWith("/en/admin");

  if (isAdmin) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res;
  }

  return NextResponse.next();
}

// Limita el middleware sólo a rutas admin
export const config = {
  matcher: ["/admin/:path*", "/es/admin/:path*", "/en/admin/:path*"],
};
