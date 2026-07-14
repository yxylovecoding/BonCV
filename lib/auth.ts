import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'boncv_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function encode(value: string) {
  return Buffer.from(value).toString('base64url');
}

function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value && process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is required');
  return value ?? 'boncv-local-session-secret-change-me';
}

export function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(digest(left));
  const b = Buffer.from(digest(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signSession(exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS) {
  const payload = encode(JSON.stringify({ exp }));
  return `${payload}.${createHmac('sha256', sessionSecret()).update(payload).digest('hex')}`;
}

export function verifySession(token?: string | null) {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  const expected = payload ? createHmac('sha256', sessionSecret()).update(payload).digest('hex') : '';
  if (!payload || !signature || !safeEqual(signature, expected)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp: number };
    return parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function requireSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export function createIntegrationSecret() {
  return `bcv_${randomBytes(24).toString('base64url')}`;
}

export function getLoginKey() {
  if (process.env.BONCV_LOGIN_KEY) return process.env.BONCV_LOGIN_KEY;
  return process.env.NODE_ENV === 'production' ? '' : 'yy';
}
