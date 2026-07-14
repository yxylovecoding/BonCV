import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { toAdminState, updateState } from '@/lib/state';

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const state = await updateState((current) => {
    const key = current.integrationKeys.find((item) => item.id === id);
    if (key && !key.revokedAt) key.revokedAt = new Date().toISOString();
    return current;
  });
  return NextResponse.json(toAdminState(state));
}
