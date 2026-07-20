import { describe, expect, it } from 'vitest';
import { compactHighlights, highlightsFromTextarea } from '../lib/highlights';

describe('highlights textarea', () => {
  it('preserves a newly entered trailing line break', () => {
    const highlights = highlightsFromTextarea('第一条\n');

    expect(highlights).toEqual(['第一条', '']);
    expect(highlights.join('\n')).toBe('第一条\n');
  });

  it('removes empty rows after editing finishes', () => {
    expect(compactHighlights(['第一条', '', '第二条'])).toEqual(['第一条', '第二条']);
  });
});
