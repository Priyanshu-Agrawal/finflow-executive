import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAMES, verifyAccessToken, verifyRefreshToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths that never require authentication
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') // public assets like png, jpg, svg
  ) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const refreshToken = req.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.value;

  // 1. Check if access token is valid
  if (accessToken) {
    const verified = await verifyAccessToken(accessToken);
    if (verified) {
      return NextResponse.next();
    }
  }

  // 2. If access token expired or absent, check if refresh token is valid
  if (refreshToken) {
    const refreshVerified = await verifyRefreshToken(refreshToken);
    if (refreshVerified) {
      // Refresh token is valid; let the request continue so the client or route can refresh
      return NextResponse.next();
    }
  }

  // 3. Not authenticated -> redirect to /login or return 401
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
