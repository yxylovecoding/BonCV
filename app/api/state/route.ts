import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getState, toAdminState, updateState } from '@/lib/state';
import { stateUpdateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(toAdminState(await getState()), { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: NextRequest) {
  if (!(await requireSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = stateUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const body = parsed.data;
  try {
    const next = await updateState((state) => ({
      ...state,
      profile: body.profile,
      sections: body.sections,
      presets: body.presets,
    }), body.expectedRevision);
    return NextResponse.json(toAdminState(next));
  } catch (error) {
    if (error instanceof Error && error.message === 'REVISION_CONFLICT') {
      return NextResponse.json({ error: 'revision conflict', state: toAdminState(await getState()) }, { status: 409 });
    }
    throw error;
  }
}
