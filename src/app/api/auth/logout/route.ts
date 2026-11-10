import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAMES } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const customDomain = process.env.COOKIE_DOMAIN?.trim();

  const res = NextResponse.json({ success: true, message: 'Logged out successfully' });

  res.cookies.set(AUTH_COOKIE_NAMES.ACCESS_TOKEN, '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
    ...(customDomain ? { domain: customDomain } : {}),
  });

  res.cookies.set(AUTH_COOKIE_NAMES.REFRESH_TOKEN, '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
    ...(customDomain ? { domain: customDomain } : {}),
  });

  return res;
}
