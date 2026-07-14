import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { readArtifact, saveArtifact } from '@/lib/artifacts';
import { getState } from '@/lib/state';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await requireSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const file = (await request.formData()).get('photo');
  if (!(file instanceof File) || !['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'invalid image' }, { status: 400 });
  }
  const extension = file.type === 'image/png' ? 'png' : 'jpg';
  const photoUrl = await saveArtifact(`photos/profile-${Date.now()}.${extension}`, Buffer.from(await file.arrayBuffer()), file.type);
  return NextResponse.json({ photoUrl }, { status: 201 });
}

export async function GET() {
  if (!(await requireSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const location = (await getState()).profile.photoUrl;
  if (!location) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const artifact = await readArtifact(location);
  return new NextResponse(artifact.stream, { headers: { 'Content-Type': artifact.contentType ?? 'image/jpeg', 'Cache-Control': 'private, max-age=300' } });
}
