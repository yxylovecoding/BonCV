import { describe, expect, it } from 'vitest';
import { waitForPendingSave } from '@/lib/autosave';

describe('generation autosave barrier', () => {
  it('waits for pending changes before continuing', async () => {
    let pending = true;
    setTimeout(() => { pending = false; }, 10);

    await expect(waitForPendingSave(() => pending, { timeoutMs: 100, pollMs: 2 })).resolves.toBeUndefined();
  });

  it('reports a stalled autosave instead of generating stale content', async () => {
    await expect(waitForPendingSave(() => true, { timeoutMs: 5, pollMs: 1 }))
      .rejects.toThrow('自动保存尚未完成');
  });
});
