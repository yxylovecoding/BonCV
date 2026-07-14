import { NextRequest, NextResponse } from 'next/server';
import { createIntegrationSecret, digest, requireSession } from '@/lib/auth';
import { toAdminState, updateState } from '@/lib/state';

export async function POST(request: NextRequest) {
  if (!(await requireSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { label?: string };
  const label = body.label?.trim().slice(0, 60) || 'FIRE 连接';
  const secret = createIntegrationSecret();
  const now = new Date().toISOString();
  const state = await updateState((current) => {
    current.integrationKeys.unshift({
      id: crypto.randomUUID(), label, prefix: secret.slice(0, 12), secretHash: digest(secret), scopes: ['fire:read'],
      createdAt: now, lastUsedAt: null, revokedAt: null,
    });
    return current;
  });
  return NextResponse.json({ secret, state: toAdminState(state) }, { status: 201 });
}
