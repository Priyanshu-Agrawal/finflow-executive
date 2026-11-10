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
          email: verified.email,
          name: verified.name,
        },
      });
    }
  }

  // If access token is expired, check if refresh token is valid (silent refresh)
  const refreshToken = req.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.value;
  if (refreshToken) {
    const refreshVerified = await verifyRefreshToken(refreshToken);
    if (refreshVerified) {
      const userEmail = refreshVerified.email;
      const userName = 'Priyanshu Agrawal';
      const newAccessToken = await createAccessToken({
        email: userEmail,
        name: userName,
        role: 'executive',
      });

      const res = NextResponse.json({
        authenticated: true,
        user: {
          email: userEmail,
          name: userName,
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
