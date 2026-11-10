import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'finflow_executive_fallback_secret_key_2026_super_secure_token_minimum_32_bytes'
);

export interface TokenPayload {
  username: string;
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
export async function createRefreshToken(username: string): Promise<string> {
  return new SignJWT({ username, type: 'refresh' })
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
export async function verifyRefreshToken(token: string): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== 'refresh' || (!payload.username && !payload.email)) return null;
    return { username: (payload.username || payload.email) as string };
  } catch {
    return null;
  }
}

/**
 * Get cookie options respecting custom subdomain or localhost / LAN IP
 */
export function getCookieOptions(
  maxAgeSec: number,
  req?: { headers?: Headers; nextUrl?: { protocol?: string; hostname?: string } }
) {
  // If explicitly overridden via COOKIE_SECURE environment variable:
  if (process.env.COOKIE_SECURE === 'true') {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: maxAgeSec,
    };
  }
  if (process.env.COOKIE_SECURE === 'false') {
    return {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: maxAgeSec,
    };
  }

  // Detect HTTPS protocol
  let isHttps = false;
  let hostname = '';

  if (req) {
    if (req.headers && typeof req.headers.get === 'function') {
      const protoHeader = req.headers.get('x-forwarded-proto');
      if (protoHeader === 'https') isHttps = true;
      hostname = req.headers.get('host')?.split(':')[0] || '';
    }
    if (req.nextUrl) {
      if (req.nextUrl.protocol === 'https:' || req.nextUrl.protocol === 'https') {
        isHttps = true;
      }
      if (req.nextUrl.hostname) {
        hostname = req.nextUrl.hostname;
      }
    }
  }

  // Check if connecting via local network IP or localhost
  const isIpOrLocalhost =
    !hostname ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(hostname) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname);

  // A cookie MUST NEVER have secure: true over plain http on local network IP,
  // because mobile browsers (iOS Safari, Android Chrome) strictly reject it per RFC 6265bis.
  // When hosted on HTTPS (e.g. expenses.scriptingbear.com), isHttps will be true and secure will be true.
  const secure = isHttps && !isIpOrLocalhost;

  // Domain handling: only set domain if hostname ends with the custom domain and is not an IP
  const customDomain = process.env.COOKIE_DOMAIN?.trim();
  const shouldSetDomain =
    customDomain &&
    !isIpOrLocalhost &&
    hostname.endsWith(customDomain.replace(/^\./, ''));

  return {
    httpOnly: true,
    secure: Boolean(secure),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec,
    ...(shouldSetDomain ? { domain: customDomain } : {}),
  };
}

/**
 * Validate credentials against environment configuration (Username + Password)
 */
export function validateCredentials(usernameInput: string, passwordInput: string): boolean {
  const configuredUser = (
    process.env.AUTH_USERNAME ||
    process.env.AUTH_USER ||
    'scriptingbear'
  ).toLowerCase().trim();
  const configuredPass = (process.env.AUTH_PASSWORD || 'FinFlow@2026!').trim();

  const u = usernameInput.toLowerCase().trim();
  const userMatch =
    u === configuredUser ||
    u === 'scriptingbear' ||
    u === 'admin';

  const passMatch = passwordInput.trim() === configuredPass;

  return userMatch && passMatch;
}
