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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email/username and password are required' },
        { status: 400 }
      );
    }

    const isValid = validateCredentials(email, password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please verify your email and password.' },
        { status: 401 }
      );
    }

    const userEmail = email.toLowerCase().trim();
    const userName = 'Priyanshu Agrawal';

    const accessToken = await createAccessToken({
      email: userEmail,
      name: userName,
      role: 'executive',
    });

    const refreshToken = await createRefreshToken(userEmail);

    const response = NextResponse.json({
      success: true,
      user: {
        email: userEmail,
        name: userName,
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
