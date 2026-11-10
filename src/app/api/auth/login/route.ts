import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAMES,
  ACCESS_TOKEN_MAX_AGE_SEC,
  REFRESH_TOKEN_MAX_AGE_SEC,
  createAccessToken,
  createRefreshToken,
  getCookieOptions,
  validateCredentials,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = (body.username || body.email || '').trim();
    const password = (body.password || '').trim();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const isValid = validateCredentials(username, password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const accessToken = await createAccessToken({
      username,
      role: 'executive',
    });

    const refreshToken = await createRefreshToken(username);

    const response = NextResponse.json({
      success: true,
      user: {
        username,
      },
    });

    // Set HTTP-Only Access Token Cookie (15 min)
    response.cookies.set(
      AUTH_COOKIE_NAMES.ACCESS_TOKEN,
      accessToken,
      getCookieOptions(ACCESS_TOKEN_MAX_AGE_SEC)
    );

    // Set HTTP-Only Refresh Token Cookie (30 days)
    response.cookies.set(
      AUTH_COOKIE_NAMES.REFRESH_TOKEN,
      refreshToken,
      getCookieOptions(REFRESH_TOKEN_MAX_AGE_SEC)
    );

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
