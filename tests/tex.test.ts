import { describe, expect, it } from 'vitest';
import { demoState } from '@/lib/fixtures';
import { identityHeightMm, packHeadlineItems, renderResumeTex, texEscape } from '@/lib/tex';

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
    expect(tex).toContain('includegraphics[width=20mm,height=28mm,keepaspectratio]{photo.png}');
    expect(tex).not.toContain(demoState.profile.email);
  });

  it('uses the reference PDF header and section hierarchy', () => {
    const state = structuredClone(demoState);
    state.profile.politicalStatus = '中共党员';
    state.profile.origin = '江苏省常州市';
    const tex = renderResumeTex(state, state.presets[0]);
    expect(tex).toContain(String.raw`\makebox[0pt][l]{\begin{minipage}[t][36mm][t]{\textwidth}`);
    expect(tex).toContain(String.raw`\begin{minipage}[t][36mm][t]{0.72\textwidth}`);
    expect(tex).toContain(String.raw`\cvprofileline{手机}{13800000000}`);
    expect(tex).toContain(String.raw`\cvprofileline{政治面貌}{中共党员}`);
    expect(tex).toContain(String.raw`\definecolor{keycolor}{RGB}{102,8,116}`);
    expect(tex).toContain(String.raw`\cveducation{示例大学}{机械专业}{硕士（推免入学）}{2025-09 -- 至今}`);
    expect(tex).toContain(String.raw`\item \textbf{项目介绍：}在边缘计算平台实现大语言模型离线部署。`);
  });

  it('expands and compacts the identity header for many headline and contact rows', () => {
    const state = structuredClone(demoState);
    state.profile.headline = ['小论文已发', '大论文 75%', '最早 8.24 到岗', '可实习一年以上', '每周到岗 4-5 天'];
    state.profile.politicalStatus = '中共党员';
    state.profile.origin = '江苏省常州市';
    state.presets[0].profileFields = ['headline', 'phone', 'email', 'politicalStatus', 'origin'];

    const tex = renderResumeTex(state, state.presets[0]);

    expect(packHeadlineItems(state.profile.headline)).toEqual([
      ['小论文已发', '大论文 75%', '最早 8.24 到岗'],
      ['可实习一年以上', '每周到岗 4-5 天'],
    ]);
    expect(identityHeightMm(2, 4)).toBe(36);
    expect(tex.match(/\\begin\{minipage\}\[t\]\[36mm\]\[t\]/g)).toHaveLength(3);
    expect(tex).toContain('小论文已发\\quad 大论文 75\\%\\quad 最早 8.24 到岗\\par\n可实习一年以上\\quad 每周到岗 4-5 天');
    expect(tex).toContain(String.raw`\fontsize{10.5}{13}\selectfont`);
  });

  it('normalizes legacy middle-dot headlines into compact reference-style rows', () => {
    const state = structuredClone(demoState);
    state.profile.headline = ['长期实习 · 每周到岗 4-5 天'];
    const tex = renderResumeTex(state, state.presets[0]);
    expect(tex).toContain('长期实习\\quad 每周到岗 4-5 天');
    expect(tex).not.toContain('长期实习 · 每周到岗');
  });

  it('uses the reference PDF page geometry and compact list spacing', () => {
    const tex = renderResumeTex(demoState, demoState.presets[0]);
    expect(tex).toContain(String.raw`\setlength{\oddsidemargin}{-0.62in}`);
    expect(tex).toContain(String.raw`\setlength{\topmargin}{-0.53in}`);
    expect(tex).toContain(String.raw`\setlength{\textheight}{10.83in}`);
    expect(tex).toContain(String.raw`\setlength{\leftmargini}{10pt}`);
    expect(tex).toContain(String.raw`\newenvironment{cvitems}{\begin{itemize}\small\setlength{\itemsep}{0pt}`);
  });

  it('keeps labeled education summaries out of the degree column', () => {
    const state = structuredClone(demoState);
    state.sections[0].entries[1].summary = 'GPA：4.2/5.0；均分：92/100；专业排名：3/291';
    const tex = renderResumeTex(state, state.presets[0]);
    expect(tex).toContain(String.raw`\cveducation{示例大学}{飞行器设计与工程}{学士}{2021-09 -- 2025-06}`);
    expect(tex).toContain(String.raw`\cvedetail{\textbf{GPA：}4.2/5.0；均分：92/100；专业排名：3/291}`);
    expect(tex).not.toContain('学士（GPA');
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
