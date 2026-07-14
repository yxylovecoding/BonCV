import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { compileTex } from '@/lib/compiler';
import { readArtifact, saveArtifact } from '@/lib/artifacts';
import { keepRecentBuilds } from '@/lib/builds';
import { getState, toAdminState, updateState } from '@/lib/state';
import { contentHash, renderResumeTex } from '@/lib/tex';
import type { ResumeBuild } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const state = await getState();
  const preset = state.presets.find((item) => item.id === id);
  if (!preset) return NextResponse.json({ error: '方案不存在' }, { status: 404 });
  let photo: { content: Buffer; filename: string } | undefined;
  if (preset.includePhoto && preset.profileFields.includes('photo') && state.profile.photoUrl) {
    const artifact = await readArtifact(state.profile.photoUrl);
    const content = Buffer.from(await new Response(artifact.stream).arrayBuffer());
    photo = { content, filename: artifact.contentType === 'image/png' ? 'photo.png' : 'photo.jpg' };
  }
  const tex = renderResumeTex(state, preset, photo?.filename);
  const hash = contentHash(photo ? `${tex}\n% photo-sha256:${contentHash(photo.content)}` : tex);
  const cached = state.builds.find((build) => build.presetId === id && build.contentHash === hash && build.status === 'ready');
  if (cached) return NextResponse.json({ cached: true, build: cached, state: toAdminState(state) });

  const buildId = crypto.randomUUID();
  const slug = preset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '') || 'resume';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
  const base = `builds/${slug}-${stamp}-${hash.slice(0, 8)}`;
  const texPath = await saveArtifact(`${base}.tex`, tex, 'application/x-tex; charset=utf-8');
  let build: ResumeBuild;
  try {
    const result = await compileTex(tex, photo);
    if (/Overfull \\hbox \((?:[1-9]|[1-9][0-9]+)\.[0-9]+pt too wide\)/.test(result.log)) {
      throw new Error('PDF 存在文本溢出，请缩短内容后重试');
    }
    const pdfPath = await saveArtifact(`${base}.pdf`, result.pdf, 'application/pdf');
    build = { id: buildId, presetId: id, presetName: preset.name, contentHash: hash, createdAt: new Date().toISOString(), texPath, pdfPath, pageCount: result.pageCount, status: 'ready' };
  } catch (error) {
    build = { id: buildId, presetId: id, presetName: preset.name, contentHash: hash, createdAt: new Date().toISOString(), texPath, pdfPath: null, pageCount: null, status: 'tex_only', error: error instanceof Error ? error.message : String(error) };
  }
  const next = await updateState((current) => {
    current.builds.unshift(build);
    current.builds = keepRecentBuilds(current.builds);
    return current;
  });
  return NextResponse.json({ build, state: toAdminState(next), warning: build.error }, { status: build.status === 'ready' ? 201 : 202 });
}
