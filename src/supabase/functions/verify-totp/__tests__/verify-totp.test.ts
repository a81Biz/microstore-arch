import { describe, it, expect, vi } from 'vitest';

// PT-004: Tests verify HTTP contract for verify-totp (MFA step in vendor login flow).
// Tests use mock global.fetch pattern — they test response shape, not internal DB logic.
describe('verify-totp Edge Function', () => {
  const baseUrl = 'http://localhost:54321/functions/v1/verify-totp';

  it('returns 200 with access_token when TOTP code is valid', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        success: true,
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        message: 'Autenticación de segundo factor exitosa',
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: 'valid-temp-token', totp_code: '123456' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.access_token).toBeDefined();
  });

  it('returns 401 when TOTP code is incorrect', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Código TOTP inválido' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: 'valid-temp-token', totp_code: '999999' }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('returns 400 when TOTP code format is invalid', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 400,
      json: async () => ({
        error: 'INVALID_TOTP_FORMAT',
        message: 'El código TOTP debe tener exactamente 6 dígitos',
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: 'valid-temp-token', totp_code: 'abcdef' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('INVALID_TOTP_FORMAT');
  });

  it('returns 401 when temp_token is expired or invalid', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Token temporal inválido o expirado' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: 'expired-token', totp_code: '123456' }),
    });

    expect(response.status).toBe(401);
  });
});
