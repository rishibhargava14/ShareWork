import { NextResponse } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/users",
  "/projects",
  "/escrow",
  "/leakage",
  "/disputes",
  "/categories",
  "/notifications",
  "/settings",
];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("sw_admin_token")?.value;
  if (!token) {
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard",
    "/users/:path*",
    "/users",
    "/projects/:path*",
    "/projects",
    "/escrow/:path*",
    "/escrow",
    "/leakage/:path*",
    "/leakage",
    "/disputes/:path*",
    "/disputes",
    "/categories/:path*",
    "/categories",
    "/notifications/:path*",
    "/notifications",
    "/settings/:path*",
    "/settings",
  ],
};
