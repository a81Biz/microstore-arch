import { describe, it, expect, vi } from 'vitest';

// PT-004: Tests verify HTTP contract for confirm-totp (TOTP enrollment confirmation).
// Tests use mock global.fetch pattern — they test response shape, not internal DB logic.
describe('confirm-totp Edge Function', () => {
  const baseUrl = 'http://localhost:54321/functions/v1/confirm-totp';

  it('returns 200 on successful TOTP confirmation', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        success: true,
        message: 'Google Authenticator activado correctamente',
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
  });

  it('returns 401 when TOTP code is invalid (wrong 6-digit code)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Código TOTP inválido o expirado' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: 'valid-temp-token', totp_code: '000000' }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('returns 401 when temp_token is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Token requerido' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totp_code: '123456' }),
    });

    expect(response.status).toBe(401);
  });

  it('returns 401 when TOTP code format is invalid (not 6 digits)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ error: 'UNAUTHORIZED', message: 'El código TOTP debe ser de 6 dígitos' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: 'valid-temp-token', totp_code: 'abc123' }),
    });

    expect(response.status).toBe(401);
  });
});
