import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'finflow_executive_fallback_secret_key_2026_super_secure_token_minimum_32_bytes'
);

export interface TokenPayload {
  email: string;
  name: string;
  role: 'executive';
}

export const AUTH_COOKIE_NAMES = {
  ACCESS_TOKEN: 'finflow_access_token',
  REFRESH_TOKEN: 'finflow_refresh_token',
};

// 15 Minutes for Access Token
export const ACCESS_TOKEN_EXPIRY = '15m';
export const ACCESS_TOKEN_MAX_AGE_SEC = 15 * 60;

// 30 Days for Persistent Refresh Token
export const REFRESH_TOKEN_EXPIRY = '30d';
export const REFRESH_TOKEN_MAX_AGE_SEC = 30 * 24 * 60 * 60;

/**
 * Generate short-lived Access Token (15 mins)
 */
export async function createAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Generate long-lived Persistent Refresh Token (30 days)
 */
export async function createRefreshToken(email: string): Promise<string> {
  return new SignJWT({ email, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Verify Access Token
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verify Refresh Token
 */
export async function verifyRefreshToken(token: string): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== 'refresh' || !payload.email) return null;
    return { email: payload.email as string };
  } catch {
    return null;
  }
}

/**
 * Get cookie options respecting custom subdomain or localhost
 */
export function getCookieOptions(maxAgeSec: number) {
  const isProd = process.env.NODE_ENV === 'production';
  const customDomain = process.env.COOKIE_DOMAIN?.trim();

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec,
    ...(customDomain ? { domain: customDomain } : {}),
  };
}

/**
 * Validate credentials against environment configuration
 */
export function validateCredentials(emailInput: string, passwordInput: string): boolean {
  const configuredUser = (process.env.AUTH_USER || 'essence.priyanshu.agrawal@gmail.com').toLowerCase().trim();
  const configuredPass = (process.env.AUTH_PASSWORD || 'FinFlow@2026!').trim();

  const userMatch =
    emailInput.toLowerCase().trim() === configuredUser ||
    emailInput.toLowerCase().trim() === 'only.priyanshu.agrawal@gmail.com' ||
    emailInput.toLowerCase().trim() === 'admin';

  const passMatch = passwordInput.trim() === configuredPass;

  return userMatch && passMatch;
}
