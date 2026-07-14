import { describe, expect, it } from 'vitest';
import { POST } from '../app/api/logout/route';

describe('logout', () => {
  it('expires the HttpOnly session cookie immediately', async () => {
    const response = POST();
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(response.status).toBe(200);
    expect(cookie).toContain('boncv_session=');
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=lax');
  });
});
