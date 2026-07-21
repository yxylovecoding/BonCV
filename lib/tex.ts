import { createHash } from 'node:crypto';
import { normalizeHeadlineItems } from './profile';
import type { BonCvState, CvEntry, CvSection, ResumePreset } from './types';

export function texEscape(value: string) {
  const replacements: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '#': '\\#',
    '$': '\\$',
    '%': '\\%',
    '&': '\\&',
    '_': '\\_',
    '{': '\\{',
    '}': '\\}',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
  };
  return value.replace(/\r?\n/g, ' ').replace(/[\\#$%&_{}~^]/g, (character) => replacements[character]);
}

function entryDate(entry: CvEntry) {
  return [entry.startDate, entry.endDate].filter(Boolean).map(texEscape).join(' -- ');
}

function emphasizedLabel(value: string) {
  const match = value.match(/^(.{1,14}?)([：:])\s*(.+)$/);
  if (!match) return texEscape(value);
  return `\\textbf{${texEscape(match[1])}${texEscape(match[2])}}${texEscape(match[3])}`;
}

function renderEducationEntry(entry: CvEntry) {
  const role = texEscape(entry.role);
  const summary = texEscape(entry.summary);
  const detail = role && summary ? `${role}（${summary}）` : role || summary;
  const highlights = entry.highlights.filter(Boolean).map((item) => `\\cvedetail{${emphasizedLabel(item)}}`).join('\n');
  return `\\cveducation{${texEscape(entry.organization)}}{${texEscape(entry.title)}}{${detail}}{${entryDate(entry)}}\n${highlights}`;
}

function renderSkillsEntry(entry: CvEntry) {
  const heading = [entry.organization, entry.title].filter(Boolean).map(texEscape).join(' · ');
  const summary = entry.summary ? `\\cvskillline{${emphasizedLabel(entry.summary)}}` : '';
  const highlights = entry.highlights.filter(Boolean).map((item) => `\\cvskillline{${emphasizedLabel(item)}}`).join('\n');
  const showHeading = heading && !['技术与兴趣', '综合技能'].includes(entry.title);
  return `${showHeading ? `\\cvheading{${heading}}{${entryDate(entry)}}` : ''}\n${summary}\n${highlights}`;
}

function summaryLabel(kind: CvSection['kind']) {
  if (kind === 'competition') return '竞赛简介';
  if (kind === 'experience') return '经历简介';
  if (kind === 'research') return '项目介绍';
  return '简介';
}

function renderStandardEntry(entry: CvEntry, kind: CvSection['kind']) {
  const heading = [entry.organization, entry.title].filter(Boolean).map(texEscape).join(' · ');
  const role = entry.role ? `（${texEscape(entry.role)}）` : '';
  const summary = entry.summary ? `\\item \\textbf{${summaryLabel(kind)}：}${texEscape(entry.summary)}` : '';
  const bullets = entry.highlights.filter(Boolean).map((item) => `\\item ${emphasizedLabel(item)}`).join('\n');
  const items = summary || bullets
    ? `\\begin{cvitems}\n${[summary, bullets].filter(Boolean).join('\n')}\n\\end{cvitems}`
    : '';
  return `\\cvheading{${heading}${role}}{${entryDate(entry)}}\n${items}`;
}

function renderEntry(entry: CvEntry, kind: CvSection['kind']) {
  if (kind === 'education') return renderEducationEntry(entry);
  if (kind === 'skills') return renderSkillsEntry(entry);
  return renderStandardEntry(entry, kind);
}

export function entryForPreset(entry: CvEntry, preset: ResumePreset): CvEntry {
  const override = preset.entryOverrides?.[entry.id];
  if (!override) return entry;
  return {
    ...entry,
    ...override,
    highlights: override.highlights ?? entry.highlights,
  };
}

export function identityHeightMm(headlineLines: number, contactLines: number) {
  return Math.max(36, Math.ceil(7 + headlineLines * 4.8 + contactLines * 4.1));
}

function displayWidth(value: string) {
  return [...value].reduce((width, character) => width + (/[^\u0000-\u00ff]/.test(character) ? 2 : 1), 0);
}

export function packHeadlineItems(items: string[], maxWidth = 44) {
  const rows: string[][] = [];

  for (const item of items) {
    const current = rows.at(-1);
    const nextWidth = (current ?? []).reduce((width, value) => width + displayWidth(value), 0)
      + Math.max(0, (current?.length ?? 0) * 2)
      + displayWidth(item);
    if (!current || current.length >= 3 || nextWidth > maxWidth) {
      rows.push([item]);
    } else {
      current.push(item);
    }
  }

  return rows;
}

export function renderResumeTex(state: BonCvState, preset: ResumePreset, photoFilename?: string) {
  const fields = new Set(preset.profileFields);
  const selected = new Set(preset.selectedEntryIds);
  const order = new Map(preset.entryOrder.map((entryId, index) => [entryId, index]));
  const sectionOrder = new Map(preset.sectionOrder.map((sectionId, index) => [sectionId, index]));
  const sections = state.sections
    .map((section) => ({
      ...section,
      entries: section.entries
        .filter((entry) => selected.has(entry.id))
        .map((entry) => entryForPreset(entry, preset))
        .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)),
    }))
    .filter((section) => section.entries.length)
    .sort((a, b) => (sectionOrder.get(a.id) ?? a.order) - (sectionOrder.get(b.id) ?? b.order));
  const contactItems = [
    fields.has('phone') && state.profile.phone ? `\\cvprofileline{手机}{${texEscape(state.profile.phone)}}` : '',
    fields.has('email') && state.profile.email ? `\\cvprofileline{邮箱}{${texEscape(state.profile.email)}}` : '',
    fields.has('politicalStatus') && state.profile.politicalStatus ? `\\cvprofileline{政治面貌}{${texEscape(state.profile.politicalStatus)}}` : '',
    fields.has('origin') && state.profile.origin ? `\\cvprofileline{籍贯}{${texEscape(state.profile.origin)}}` : '',
  ].filter(Boolean);
  const contactLines = contactItems.join('\n');
  const headlineItems = fields.has('headline') ? normalizeHeadlineItems(state.profile.headline) : [];
  const headlineRows = packHeadlineItems(headlineItems);
  const headline = headlineRows.map((row) => row.map(texEscape).join('\\quad ')).join('\\par\n');
  const headlineLineCount = headlineRows.length;
  const identityHeight = identityHeightMm(headlineLineCount, contactItems.length);
  const photo = photoFilename
    ? `\\raggedleft\\includegraphics[width=20mm,height=28mm,keepaspectratio]{${texEscape(photoFilename)}}`
    : '';
  const identity = `\\noindent
\\makebox[0pt][l]{\\begin{minipage}[t][${identityHeight}mm][t]{\\textwidth}\\vspace{5mm}\\centering
{\\fontsize{26}{31}\\selectfont\\bfseries\\ziju{0.42}${texEscape(state.profile.name)}}
\\end{minipage}}
\\begin{minipage}[t][${identityHeight}mm][t]{0.72\\textwidth}\\vspace{0pt}
${headline ? `{\\color{keycolor}\\bfseries\\fontsize{10.5}{13}\\selectfont ${headline}}\\par\\vspace{5pt}` : ''}
{\\small ${contactLines}}
\\end{minipage}\\hfill
\\begin{minipage}[t][${identityHeight}mm][t]{0.20\\textwidth}\\vspace{0pt}
${photo}
\\end{minipage}\\par\\vspace{-1pt}`;

  return String.raw`\documentclass[UTF8,fontset=fandol,10pt,a4paper]{ctexart}
\ExplSyntaxOn\pdf_uncompress:\ExplSyntaxOff
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{graphicx}
\definecolor{keycolor}{RGB}{102,8,116}
\hypersetup{hidelinks}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\headheight}{0pt}
\setlength{\headsep}{0pt}
\setlength{\oddsidemargin}{-0.62in}
\setlength{\evensidemargin}{-0.62in}
\setlength{\textwidth}{7.5in}
\setlength{\topmargin}{-0.53in}
\setlength{\textheight}{10.83in}
\setlength{\tabcolsep}{0pt}
\setlength{\leftmargini}{10pt}
\setlength{\labelsep}{0.45em}
\raggedright
\newcommand{\cvprofileline}[2]{\textbf{#1：}#2\par\vspace{1pt}}
\newcommand{\cvsection}[1]{\vspace{2pt}{\fontsize{12}{14}\selectfont\bfseries\color{keycolor}#1}\par\vspace{1pt}{\color{keycolor}\hrule height 0.45pt}\vspace{2pt}}
\newcommand{\cvheading}[2]{\vspace{1pt}\begin{tabular*}{\textwidth}{@{}l@{\extracolsep{\fill}}r@{}}{\fontsize{10.5}{12.5}\selectfont\textbf{#1}} & {\fontsize{10.5}{12.5}\selectfont #2}\\\end{tabular*}\par\vspace{-1pt}}
\newcommand{\cveducation}[4]{\begin{tabular*}{\textwidth}{@{}p{0.23\textwidth}@{\extracolsep{\fill}}p{0.36\textwidth}p{0.15\textwidth}r@{}}{\fontsize{10.5}{12.5}\selectfont\textbf{#1}} & {\fontsize{10.5}{12.5}\selectfont #2} & {\fontsize{10.5}{12.5}\selectfont\textbf{#3}} & {\fontsize{10.5}{12.5}\selectfont #4}\\\end{tabular*}\par\vspace{-1pt}}
\newcommand{\cvedetail}[1]{{\small #1}\par\vspace{1pt}}
\newcommand{\cvskillline}[1]{{\small #1}\par\vspace{1pt}}
\newenvironment{cvitems}{\begin{itemize}\small\setlength{\itemsep}{0pt}\setlength{\parsep}{0pt}\setlength{\topsep}{1pt}\setlength{\partopsep}{0pt}}{\end{itemize}\vspace{-3pt}}
\begin{document}
${identity}
${sections.map((section) => `\\cvsection{${texEscape(section.title)}}\n${section.entries.map((entry) => renderEntry(entry, section.kind)).join('\n')}`).join('\n')}
\end{document}
`;
}

export function contentHash(content: string | Buffer) {
  return createHash('sha256').update(content).digest('hex');
}
