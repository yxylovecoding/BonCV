import { describe, expect, it } from 'vitest';
import { groupBuildsByPreset, keepRecentBuilds } from '@/lib/builds';
import type { ResumeBuild } from '@/lib/types';

function build(presetId: string, index: number): ResumeBuild {
  return {
    id: `${presetId}-${index}`,
    presetId,
    presetName: presetId,
    iteration: index + 1,
    contentHash: String(index),
    createdAt: new Date(2026, 0, index + 1).toISOString(),
    texPath: `local:${index}.tex`,
    pdfPath: null,
    pageCount: null,
    status: 'tex_only',
  };
}

describe('resume build retention', () => {
  it('keeps the newest 20 builds independently for each preset', () => {
    const input = [...Array.from({ length: 24 }, (_, index) => build('a', index)), ...Array.from({ length: 22 }, (_, index) => build('b', index))];
    const result = keepRecentBuilds(input);
    expect(result.filter((item) => item.presetId === 'a')).toHaveLength(20);
    expect(result.filter((item) => item.presetId === 'b')).toHaveLength(20);
    expect(result[0].id).toBe('a-0');
  });

  it('groups iterations by JD direction while preserving newest-first order', () => {
    const groups = groupBuildsByPreset([build('ai', 3), build('backend', 2), build('ai', 1)]);
    expect(groups.map((group) => group.presetId)).toEqual(['ai', 'backend']);
    expect(groups[0].builds.map((item) => item.id)).toEqual(['ai-3', 'ai-1']);
  });
});
