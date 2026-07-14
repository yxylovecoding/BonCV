import { NextRequest, NextResponse } from 'next/server';
import { getLoginKey, safeEqual, SESSION_COOKIE, signSession, verifySession } from './lib/auth';

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/access' ||
    pathname === '/api/logout' ||
    pathname === '/api/v1/fire-profile'
  ) {
    return NextResponse.next();
  }

  const key = searchParams.get('key');
  if (key) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete('key');
    if (getLoginKey() && safeEqual(key, getLoginKey())) {
      const response = NextResponse.redirect(clean);
      response.cookies.set(SESSION_COOKIE, signSession(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 12,
      });
      return response;
    }
    clean.pathname = '/access';
    clean.searchParams.set('error', 'invalid');
    return NextResponse.redirect(clean);
  }

  if (verifySession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const access = request.nextUrl.clone();
  access.pathname = '/access';
  access.search = '';
  return NextResponse.redirect(access);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
