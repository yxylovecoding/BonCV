import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { readArtifact } from '@/lib/artifacts';
import { attachmentDisposition } from '@/lib/download';
import { getState } from '@/lib/state';

export async function GET(_: Request, context: { params: Promise<{ id: string; kind: string }> }) {
  if (!(await requireSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, kind } = await context.params;
  const build = (await getState()).builds.find((item) => item.id === id);
  if (!build || !['tex', 'pdf'].includes(kind)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const location = kind === 'pdf' ? build.pdfPath : build.texPath;
  if (!location) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const artifact = await readArtifact(location);
  const extension = kind === 'pdf' ? 'pdf' : 'tex';
  return new NextResponse(artifact.stream, {
    headers: {
      'Content-Type': kind === 'pdf' ? 'application/pdf' : 'application/x-tex; charset=utf-8',
      'Content-Disposition': attachmentDisposition(build.presetName, extension),
      'Cache-Control': 'private, no-store',
    },
  });
}
