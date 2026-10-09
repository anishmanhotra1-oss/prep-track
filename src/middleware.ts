import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "prepwise_super_secret_jwt_key_32bytes_min_length_123456"
);

const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "prepwise_super_secret_refresh_jwt_key_32bytes_123456"
);

async function checkAuth(req: NextRequest): Promise<boolean> {
  const accessToken = req.cookies.get("access_token")?.value;
  if (accessToken) {
    try {
      await jwtVerify(accessToken, JWT_SECRET);
      return true;
    } catch {
      // access token expired or invalid, check refresh token below
    }
  }

  const refreshToken = req.cookies.get("refresh_token")?.value;
  if (refreshToken) {
    try {
      await jwtVerify(refreshToken, JWT_REFRESH_SECRET);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthenticated = await checkAuth(req);

  const authPages = ["/login", "/register"];
  const isLandingPage = pathname === "/";
  const isAuthPage = authPages.includes(pathname);

  // If user is authenticated and visits landing page or auth pages, redirect to dashboard workspace
  if (isAuthenticated && (isLandingPage || isAuthPage)) {
    return NextResponse.redirect(new URL("/stopwatch", req.url));
  }

  // If user is NOT authenticated and attempts to access dashboard routes, redirect to login
  const protectedPrefixes = [
    "/stopwatch",
    "/history",
    "/stats",
    "/revisions",
    "/todos",
    "/syllabus",
    "/planner",
    "/settings",
  ];

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isAuthenticated && isProtected) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files, images, favicons, and api routes.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
