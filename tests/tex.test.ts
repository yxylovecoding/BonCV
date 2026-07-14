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
    expect(tex).toContain('includegraphics[width=27mm,height=34mm,keepaspectratio]{photo.png}');
    expect(tex).not.toContain(demoState.profile.email);
  });

  it('uses the reference PDF header and section hierarchy', () => {
    const state = structuredClone(demoState);
    state.profile.politicalStatus = '中共党员';
    state.profile.origin = '江苏省常州市';
    const tex = renderResumeTex(state, state.presets[0]);
    expect(tex).toContain(String.raw`\makebox[0pt][l]{\begin{minipage}[t][38mm][t]{\textwidth}`);
    expect(tex).toContain(String.raw`\begin{minipage}[t][38mm][t]{0.45\textwidth}`);
    expect(tex).toContain(String.raw`\cvprofileline{手机}{13800000000}`);
    expect(tex).toContain(String.raw`\cvprofileline{政治面貌}{中共党员}`);
    expect(tex).toContain(String.raw`\definecolor{keycolor}{RGB}{102,8,116}`);
    expect(tex).toContain(String.raw`\cveducation{示例大学}{机械专业}{硕士（推免入学）}{2025-09 -- 至今}`);
    expect(tex).toContain(String.raw`\item \textbf{项目介绍：}在边缘计算平台实现大语言模型离线部署。`);
  });

  it('renders legacy middle-dot headlines as separate lines', () => {
    const state = structuredClone(demoState);
    state.profile.headline = ['长期实习 · 每周到岗 4-5 天'];
    const tex = renderResumeTex(state, state.presets[0]);
    expect(tex).toContain('长期实习\\par\n每周到岗 4-5 天');
    expect(tex).not.toContain('长期实习 · 每周到岗');
  });

  it('uses the JD-specific entry version without changing shared content', () => {
    const state = structuredClone(demoState);
    const preset = state.presets[0];
    preset.entryOverrides['research-edge-llm'] = {
      title: '面向大模型应用的边缘部署',
      summary: '突出与目标 JD 相关的模型部署能力。',
      highlights: ['针对 JD 重写的项目要点'],
    };
    const tex = renderResumeTex(state, preset);
    expect(tex).toContain('面向大模型应用的边缘部署');
    expect(tex).toContain('针对 JD 重写的项目要点');
    expect(tex).not.toContain('搭建端侧低延迟自然语言处理流水线');
    expect(state.sections[1].entries[0].title).toBe('边缘侧私有化 LLM 部署实践');
  });
});
