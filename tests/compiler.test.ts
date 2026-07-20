import { describe, expect, it } from 'vitest';
import { pdfLayoutWarning } from '../lib/compiler';

describe('PDF compiler warnings', () => {
  it('keeps an overfull PDF usable while asking for a visual check', () => {
    expect(pdfLayoutWarning('Overfull \\hbox (12.5pt too wide) in paragraph')).toContain('PDF 已生成');
  });

  it('does not warn for normal compiler output or sub-point overflow', () => {
    expect(pdfLayoutWarning('Output written on resume.pdf (2 pages).')).toBeUndefined();
    expect(pdfLayoutWarning('Overfull \\hbox (0.8pt too wide) in paragraph')).toBeUndefined();
  });
});
