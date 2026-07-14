import { describe, expect, it } from 'vitest';
import { createIntegrationSecret, digest, signSession, verifySession } from '@/lib/auth';

describe('authentication primitives', () => {
  it('creates opaque integration keys and hashes them', () => {
    const secret = createIntegrationSecret();
    expect(secret.startsWith('bcv_')).toBe(true);
    expect(digest(secret)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('accepts live sessions and rejects expired sessions', () => {
    expect(verifySession(signSession(Math.floor(Date.now() / 1000) + 60))).toBe(true);
    expect(verifySession(signSession(Math.floor(Date.now() / 1000) - 60))).toBe(false);
  });
});
