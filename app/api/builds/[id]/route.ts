import { NextResponse } from 'next/server';
import { deleteArtifact } from '@/lib/artifacts';
import { requireSession } from '@/lib/auth';
import { getState, toAdminState, updateState } from '@/lib/state';

export const runtime = 'nodejs';

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const current = await getState();
  const build = current.builds.find((item) => item.id === id);
  if (!build) return NextResponse.json({ error: '生成记录不存在' }, { status: 404 });

  const artifactLocations = [...new Set([build.texPath, build.pdfPath].filter((location): location is string => Boolean(location)))];
  await Promise.all(artifactLocations.map((location) => deleteArtifact(location)));
  const next = await updateState((state) => {
    state.builds = state.builds.filter((item) => item.id !== id);
    return state;
  });
  return NextResponse.json(toAdminState(next));
}
