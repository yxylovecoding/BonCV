import { describe, expect, it } from 'vitest';
import { demoState } from '@/lib/fixtures';
import { renderResumeTex, texEscape } from '@/lib/tex';

describe('TeX rendering', () => {
  it('escapes TeX metacharacters', () => {
    expect(texEscape(String.raw`C:\work_50% & #1`)).toBe(String.raw`C:\textbackslash{}work\_50\% \& \#1`);
  });

  it('renders only entries selected by a preset', () => {
    const state = structuredClone(demoState);
    const preset = state.presets[0];
    preset.selectedEntryIds = ['edu-master'];
    const tex = renderResumeTex(state, preset);
    expect(tex).toContain('示例大学');
    expect(tex).toContain('机械专业');
    expect(tex).not.toContain('边缘侧私有化');
    expect(tex).not.toContain('技术与兴趣');
  });

  it('omits private profile fields when not selected', () => {
    const state = structuredClone(demoState);
    state.presets[0].profileFields = [];
    const tex = renderResumeTex(state, state.presets[0]);
    expect(tex).not.toContain('13800000000');
    expect(tex).not.toContain('hello@example.com');
  });

  it('references a sanitized local photo filename only when supplied by the build pipeline', () => {
    const tex = renderResumeTex(demoState, { ...demoState.presets[0], profileFields: ['photo'], includePhoto: true }, 'photo.png');
    expect(tex).toContain('includegraphics[width=25mm,height=30mm,keepaspectratio]{photo.png}');
    expect(tex).not.toContain(demoState.profile.email);
  });
});
