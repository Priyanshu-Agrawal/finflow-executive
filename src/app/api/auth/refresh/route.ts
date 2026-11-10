import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAMES,
  ACCESS_TOKEN_MAX_AGE_SEC,
  REFRESH_TOKEN_MAX_AGE_SEC,
  createAccessToken,
  createRefreshToken,
  getCookieOptions,
  verifyRefreshToken,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
    }

    const verified = await verifyRefreshToken(refreshToken);
    if (!verified) {
      // Invalid or expired refresh token -> clear cookies
      const res = NextResponse.json(
        { error: 'Refresh token expired or invalid. Please log in again.' },
        { status: 401 }
      );
      res.cookies.delete(AUTH_COOKIE_NAMES.ACCESS_TOKEN);
      res.cookies.delete(AUTH_COOKIE_NAMES.REFRESH_TOKEN);
      return res;
    }

    const userEmail = verified.email;
    const userName = 'Priyanshu Agrawal';

    // Issue fresh access token
    const newAccessToken = await createAccessToken({
      email: userEmail,
      name: userName,
      role: 'executive',
    });

    // Rotate refresh token for maximum security
    const newRefreshToken = await createRefreshToken(userEmail);

    const res = NextResponse.json({
      success: true,
      refreshed: true,
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

    res.cookies.set(
      AUTH_COOKIE_NAMES.REFRESH_TOKEN,
      newRefreshToken,
      getCookieOptions(REFRESH_TOKEN_MAX_AGE_SEC)
    );

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Token refresh failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
