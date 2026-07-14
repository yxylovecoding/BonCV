import { describe, expect, it } from 'vitest';
import { completeOrder, reorderById } from '@/lib/order';

describe('sortable ordering', () => {
  it('moves the dragged item to the hovered position', () => {
    expect(reorderById(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
    expect(reorderById(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('keeps configured items first and appends newly available items', () => {
    expect(completeOrder(['a', 'b', 'c'], ['b', 'a'])).toEqual(['b', 'a', 'c']);
  });
});
