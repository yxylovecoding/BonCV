import { createHash } from 'node:crypto';
import { normalizeHeadlineItems } from './profile';
import type { BonCvState, CvEntry, ResumePreset } from './types';

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

function entryHeading(entry: CvEntry) {
  const left = [entry.organization, entry.title].filter(Boolean).map(texEscape).join(' · ');
  const right = [entry.startDate, entry.endDate].filter(Boolean).map(texEscape).join(' -- ');
  const role = texEscape(entry.role);
  return `\\cvheading{${left}}{${right}}${role ? `\\cvrole{${role}}` : ''}`;
}

function renderEntry(entry: CvEntry) {
  const summary = entry.summary ? `\\cvsummary{${texEscape(entry.summary)}}` : '';
  const bullets = entry.highlights.length
    ? `\\begin{itemize}\n${entry.highlights.map((item) => `\\item ${texEscape(item)}`).join('\n')}\n\\end{itemize}`
    : '';
  return `${entryHeading(entry)}\n${summary}\n${bullets}`;
}

export function renderResumeTex(state: BonCvState, preset: ResumePreset, photoFilename?: string) {
  const fields = new Set(preset.profileFields);
  const selected = new Set(preset.selectedEntryIds);
  const order = new Map(preset.entryOrder.map((entryId, index) => [entryId, index]));
  const sectionOrder = new Map(preset.sectionOrder.map((sectionId, index) => [sectionId, index]));
  const sections = state.sections
    .map((section) => ({ ...section, entries: section.entries.filter((entry) => selected.has(entry.id)).sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)) }))
    .filter((section) => section.entries.length)
    .sort((a, b) => (sectionOrder.get(a.id) ?? a.order) - (sectionOrder.get(b.id) ?? b.order));
  const contactParts = [
    fields.has('phone') && state.profile.phone ? `手机：${state.profile.phone}` : '',
    fields.has('email') && state.profile.email ? `邮箱：${state.profile.email}` : '',
    fields.has('politicalStatus') && state.profile.politicalStatus ? `政治面貌：${state.profile.politicalStatus}` : '',
    fields.has('origin') && state.profile.origin ? `籍贯：${state.profile.origin}` : '',
  ].filter(Boolean).map(texEscape);
  const headline = fields.has('headline') ? normalizeHeadlineItems(state.profile.headline).map((item) => `\\textcolor{keycolor}{\\textbf{${texEscape(item)}}}\\\\`).join('\n') : '';
  const identity = photoFilename
    ? `\\begin{minipage}[c]{0.78\\textwidth}{\\zihao{-1}\\bfseries\\ziju{0.35}${texEscape(state.profile.name)}}\\end{minipage}\\hfill\\begin{minipage}[c]{0.16\\textwidth}\\raggedleft\\includegraphics[width=25mm,height=30mm,keepaspectratio]{${texEscape(photoFilename)}}\\end{minipage}\\par\\vspace{4pt}`
    : `\\begin{center}{\\zihao{-1}\\bfseries\\ziju{0.35}${texEscape(state.profile.name)}}\\\\[4pt]\\end{center}`;

  return String.raw`\documentclass[UTF8,fontset=fandol,10pt,a4paper]{ctexart}
\ExplSyntaxOn\pdf_uncompress:\ExplSyntaxOff
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{graphicx}
\definecolor{keycolor}{RGB}{102,8,116}
\hypersetup{hidelinks}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\oddsidemargin}{-0.62in}
\setlength{\evensidemargin}{-0.62in}
\setlength{\textwidth}{7.5in}
\setlength{\topmargin}{-0.75in}
\setlength{\textheight}{10.7in}
\setlength{\tabcolsep}{0pt}
\newcommand{\cvsection}[1]{\vspace{8pt}{\large\bfseries\color{keycolor}#1}\par\vspace{2pt}{\color{keycolor}\hrule}\vspace{5pt}}
\newcommand{\cvheading}[2]{\vspace{2pt}\begin{tabular*}{\textwidth}{@{}l@{\extracolsep{\fill}}r@{}}\textbf{#1} & #2\\\end{tabular*}\par\vspace{-2pt}}
\newcommand{\cvrole}[1]{{\small\textit{#1}}\par\vspace{1pt}}
\newcommand{\cvsummary}[1]{{\small #1}\par\vspace{2pt}}
\setlength{\itemsep}{1.5pt}
\setlength{\parsep}{0pt}
\setlength{\topsep}{2pt}
\setlength{\partopsep}{0pt}
\begin{document}
${identity}
${headline}
${contactParts.length ? `{\\small ${contactParts.join('\\qquad ')}}\\par` : ''}
${sections.map((section) => `\\cvsection{${texEscape(section.title)}}\n${section.entries.map(renderEntry).join('\n')}`).join('\n')}
\end{document}
`;
}

export function contentHash(content: string | Buffer) {
  return createHash('sha256').update(content).digest('hex');
}
