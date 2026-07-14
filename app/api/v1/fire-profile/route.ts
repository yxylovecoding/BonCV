import { NextRequest, NextResponse } from 'next/server';
import { digest } from '@/lib/auth';
import { createFireProfile } from '@/lib/fire';
import { findIntegrationKey, getState, markKeyUsed, takeRateLimit } from '@/lib/state';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  if (!match) return NextResponse.json({ error: 'missing bearer token' }, { status: 401 });
  const key = await findIntegrationKey(digest(match[1].trim()));
  if (!key) return NextResponse.json({ error: 'invalid key' }, { status: 401 });
  if (key.revokedAt || !key.scopes.includes('fire:read')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!(await takeRateLimit(key.id))) return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429, headers: { 'Retry-After': '60' } });

  const state = await getState();
  const payload = createFireProfile(state.revision, state.updatedAt, state.profile.birthDate, state.sections.flatMap((section) => section.entries));
  const etag = `"boncv-${state.revision}"`;
  if (request.headers.get('if-none-match') === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  await markKeyUsed(key.id);
  return NextResponse.json(payload, { headers: { ETag: etag, 'Cache-Control': 'private, max-age=0, must-revalidate' } });
}
