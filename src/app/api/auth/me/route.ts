import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAMES,
  ACCESS_TOKEN_MAX_AGE_SEC,
  createAccessToken,
  getCookieOptions,
  verifyAccessToken,
  verifyRefreshToken,
} from '@/lib/auth';

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value;

  if (accessToken) {
    const verified = await verifyAccessToken(accessToken);
    if (verified) {
      return NextResponse.json({
        authenticated: true,
        user: {
          username: verified.username,
        },
      });
    }
  }

  // If access token is expired, check if refresh token is valid (silent refresh)
  const refreshToken = req.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.value;
  if (refreshToken) {
    const refreshVerified = await verifyRefreshToken(refreshToken);
    if (refreshVerified) {
      const username = refreshVerified.username;
      const newAccessToken = await createAccessToken({
        username,
        role: 'executive',
      });

      const res = NextResponse.json({
        authenticated: true,
        user: {
          username,
        },
      });

      res.cookies.set(
        AUTH_COOKIE_NAMES.ACCESS_TOKEN,
        newAccessToken,
        getCookieOptions(ACCESS_TOKEN_MAX_AGE_SEC)
      );

      return res;
    }
  }

  return NextResponse.json(
    { authenticated: false, error: 'Not authenticated' },
    { status: 401 }
  );
}
