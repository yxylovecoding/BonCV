import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demoState } from '@/lib/fixtures';

const mocks = vi.hoisted(() => ({
  deleteArtifact: vi.fn(),
  requireSession: vi.fn(),
  getState: vi.fn(),
  toAdminState: vi.fn((state) => state),
  updateState: vi.fn(),
}));

vi.mock('@/lib/artifacts', () => ({ deleteArtifact: mocks.deleteArtifact }));
vi.mock('@/lib/auth', () => ({ requireSession: mocks.requireSession }));
vi.mock('@/lib/state', () => ({ getState: mocks.getState, toAdminState: mocks.toAdminState, updateState: mocks.updateState }));

import { DELETE } from '../app/api/builds/[id]/route';

describe('build deletion route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = structuredClone(demoState);
    state.builds = [{
      id: 'build-1', presetId: state.presets[0].id, presetName: state.presets[0].name, iteration: 1,
      contentHash: 'hash', createdAt: new Date().toISOString(), texPath: 'local:builds/one.tex',
      pdfPath: 'local:builds/one.pdf', pageCount: 1, status: 'ready',
    }];
    mocks.requireSession.mockResolvedValue(true);
    mocks.getState.mockResolvedValue(state);
    mocks.updateState.mockImplementation(async (mutate) => mutate(structuredClone(state)));
  });

  it('deletes both artifacts and removes the build from state', async () => {
    const response = await DELETE(new Request('http://localhost'), { params: Promise.resolve({ id: 'build-1' }) });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.deleteArtifact).toHaveBeenCalledTimes(2);
    expect(mocks.deleteArtifact).toHaveBeenCalledWith('local:builds/one.tex');
    expect(mocks.deleteArtifact).toHaveBeenCalledWith('local:builds/one.pdf');
    expect(result.builds).toEqual([]);
  });

  it('rejects deletion when the build does not exist', async () => {
    const response = await DELETE(new Request('http://localhost'), { params: Promise.resolve({ id: 'missing' }) });

    expect(response.status).toBe(404);
    expect(mocks.deleteArtifact).not.toHaveBeenCalled();
    expect(mocks.updateState).not.toHaveBeenCalled();
  });
});
