import { NextRequest, NextResponse } from "next/server";

// Edge-safe middleware: only checks cookie presence, not validity.
// Full validation runs in pages/API routes (need DB access).
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Cabinet (tenant) protected area
  if (pathname.startsWith("/cabinet")) {
    // Public cabinet routes
    if (pathname === "/cabinet/login" || pathname === "/cabinet/signup") {
      return NextResponse.next();
    }

    const tenantToken = req.cookies.get("tenant_session")?.value;
    if (!tenantToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/cabinet/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cabinet/:path*"],
};
