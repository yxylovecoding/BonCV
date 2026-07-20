import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoState } from '@/lib/fixtures';

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  compileTex: vi.fn(),
  readArtifact: vi.fn(),
  saveArtifact: vi.fn(),
  getState: vi.fn(),
  toAdminState: vi.fn((state) => state),
  updateState: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireSession: mocks.requireSession }));
vi.mock('@/lib/compiler', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/compiler')>();
  return { ...original, compileTex: mocks.compileTex };
});
vi.mock('@/lib/artifacts', () => ({ readArtifact: mocks.readArtifact, saveArtifact: mocks.saveArtifact }));
vi.mock('@/lib/state', () => ({ getState: mocks.getState, toAdminState: mocks.toAdminState, updateState: mocks.updateState }));

import { POST } from '../app/api/resumes/[id]/build/route';

describe('resume PDF build route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = structuredClone(demoState);
    mocks.requireSession.mockResolvedValue(true);
    mocks.getState.mockResolvedValue(state);
    mocks.saveArtifact.mockImplementation(async (path: string) => `local:${path}`);
    mocks.updateState.mockImplementation(async (mutate) => mutate(structuredClone(state)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores a ready PDF even when TeX reports layout overflow', async () => {
    mocks.compileTex.mockResolvedValue({
      pdf: Buffer.from('%PDF-1.7'),
      log: 'Overfull \\hbox (12.5pt too wide) in paragraph',
      pageCount: 2,
      engine: 'tectonic',
    });

    const response = await POST(new Request('http://localhost'), { params: Promise.resolve({ id: demoState.presets[0].id }) });
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.build.status).toBe('ready');
    expect(result.build.pdfPath).toMatch(/\.pdf$/);
    expect(result.warning).toContain('PDF 已生成');
    expect(mocks.updateState).toHaveBeenCalledOnce();
  });

  it('does not create a TeX-only build when PDF compilation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.compileTex.mockRejectedValue(new Error('compiler unavailable'));

    const response = await POST(new Request('http://localhost'), { params: Promise.resolve({ id: demoState.presets[0].id }) });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'PDF 生成失败，请重试；若持续失败，请检查内容或编译服务' });
    expect(mocks.saveArtifact).not.toHaveBeenCalled();
    expect(mocks.updateState).not.toHaveBeenCalled();
  });
});
