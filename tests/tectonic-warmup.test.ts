import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Tectonic production cache warmup', () => {
  it('preloads the 9pt bold font combination used by resume bullets and details', async () => {
    const source = await readFile(new URL('../scripts/tectonic-warmup.tex', import.meta.url), 'utf8');

    expect(source).toContain(String.raw`\newenvironment{cvitems}{\begin{itemize}\fontsize{9.5}{11.5}\selectfont}`);
    expect(source).toContain(String.raw`\item \textbf{项目介绍：}`);
    expect(source).toContain(String.raw`\cvedetail{\textbf{GPA：}`);
    expect(source).toContain(String.raw`\fontsize{10}{13}\selectfont\cvprofileline{手机}`);
  });

  it('verifies the warmed cache in offline-only mode during installation', async () => {
    const script = await readFile(new URL('../scripts/fetch-tectonic.mjs', import.meta.url), 'utf8');

    expect(script).toContain('const DOWNLOAD_URL =');
    expect(script).toContain("const WARMUP_REVISION = '4'");
    expect(script).not.toContain('const URL =');
    expect(script).toContain("await compileWarmup(['--only-cached'])");
  });
});
