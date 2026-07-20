import { describe, expect, it, vi } from 'vitest';
import { onRequest } from '../../functions/_middleware';
import type { AuthData, Env } from '../../functions/lib/types';

describe('Access middleware', () => {
  it('fails closed in production without Access configuration', async () => {
    const response = await onRequest({
      request: new Request('https://portfolio.example/api/dashboard'),
      env: { DB: {} as D1Database, ENVIRONMENT: 'production' },
      data: {} as AuthData,
    } as never);
    expect(response.status).toBe(403);
  });

  it('only bypasses auth with both explicit development flags', async () => {
    const next = vi.fn(async () => new Response('ok'));
    const context = {
      request: new Request('http://localhost/api/dashboard'),
      env: { DB: {} as D1Database, ENVIRONMENT: 'development', DEV_AUTH_BYPASS: 'true' } as Env,
      data: {} as AuthData,
      next,
    };
    const response = await onRequest(context as never);
    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledOnce();
  });
});
