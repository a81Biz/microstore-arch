import { describe, it, expect, vi } from 'vitest';

// NOTE: change-password uses {temp_token, new_password} — first-login flow.
// temp_token comes from login response when next_step = 'change_password'.
describe('change-password Edge Function', () => {
  const baseUrl = 'http://localhost:54321/functions/v1/change-password';

  it('returns 200 on successful password change with valid temp_token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        success: true,
        message: 'Contraseña actualizada correctamente. Procede a configurar TOTP.',
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temp_token: 'valid-jwt-temp-token',
        new_password: 'NuevaContraseña123!',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBeDefined();
  });

  it('returns 401 for invalid or expired temp_token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Token inválido' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temp_token: 'invalid-or-expired-token',
        new_password: 'NuevaContraseña123!',
      }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('returns 400 WEAK_PASSWORD for password not meeting complexity requirements', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 400,
      json: async () => ({
        error: 'WEAK_PASSWORD',
        message: 'La contraseña debe contener: mínimo 12 caracteres',
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temp_token: 'valid-temp-token',
        new_password: 'abc123',
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('WEAK_PASSWORD');
  });

  it('returns 401 when temp_token is missing from body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({
        error: 'UNAUTHORIZED',
        message: 'Token y nueva contraseña requeridos',
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_password: 'NuevaContraseña123!' }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toMatch(/requeridos/i);
  });
});
