import { describe, expect, it } from 'vitest';
import { attachmentDisposition } from '../lib/download';

describe('attachmentDisposition', () => {
  it('keeps HTTP headers ASCII-only while preserving a UTF-8 filename', () => {
    const header = attachmentDisposition('中文 简历', 'pdf');
    expect(header).toContain('filename="BonCV-resume.pdf"');
    expect(header).toContain("filename*=UTF-8''BonCV-%E4%B8%AD%E6%96%87-%E7%AE%80%E5%8E%86.pdf");
    expect([...header].every((character) => character.charCodeAt(0) <= 0x7f)).toBe(true);
  });
});
