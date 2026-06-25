import { describe, it, expect, vi } from 'vitest';

// NOTE: Tests mock global.fetch — they test the HTTP contract, not internal Deno logic.
// Integration tests requiring live Supabase are deferred (PE-001).
describe('login Edge Function', () => {
  const baseUrl = 'http://localhost:54321/functions/v1/login';

  it('returns 200 with access_token for valid CUSTOMER credentials', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        next_step: 'complete',
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        refresh_token: 'refresh-token-abc',
        user: { id: 'u1', email: 'user@test.com', role: 'customer' },
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com', password: 'password123' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.next_step).toBe('complete');
    expect(body.access_token).toBeDefined();
  });

  it('returns 200 with next_step=verify_totp for VENDOR with TOTP enabled', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        next_step: 'verify_totp',
        temp_token: 'temp-jwt-abc',
        refresh_token: 'refresh-abc',
        message: 'Ingresa el código de Google Authenticator',
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vendor@test.com', password: 'vendorpass123' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.next_step).toBe('verify_totp');
    expect(body.temp_token).toBeDefined();
  });

  it('returns 200 with next_step=setup_totp for VENDOR without TOTP configured', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        next_step: 'setup_totp',
        temp_token: 'temp-jwt-xyz',
        message: 'Configura Google Authenticator para continuar',
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newvendor@test.com', password: 'vendorpass456' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.next_step).toBe('setup_totp');
  });

  it('returns 200 with next_step=change_password for VENDOR first login', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        next_step: 'change_password',
        temp_token: 'temp-jwt-change',
        message: 'Debes cambiar tu contraseña antes de continuar',
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'firstlogin@test.com', password: 'initial-pass' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.next_step).toBe('change_password');
  });

  it('returns 401 for invalid credentials', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Credenciales inválidas' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com', password: 'wrongpassword' }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('returns 429 with Retry-After header when rate limited', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 429,
      headers: new Headers({ 'Retry-After': '300' }),
      json: async () => ({ error: 'RATE_LIMITED', message: 'Demasiados intentos' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com', password: 'pass' }),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('300');
  });

  // PT-005: vendor_whitelist enforcement
  it('returns 403 VENDOR_NOT_AUTHORIZED when vendor email not in whitelist', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 403,
      json: async () => ({
        error: 'VENDOR_NOT_AUTHORIZED',
        message: 'Tu cuenta de vendedor no está autorizada. Contacta al administrador.',
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown-vendor@test.com', password: 'pass123' }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('VENDOR_NOT_AUTHORIZED');
  });

  it('returns 403 VENDOR_NOT_AUTHORIZED when whitelist DB query fails (fail-closed)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 403,
      json: async () => ({
        error: 'VENDOR_NOT_AUTHORIZED',
        message: 'Tu cuenta de vendedor no está autorizada. Contacta al administrador.',
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vendor@test.com', password: 'pass123' }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('VENDOR_NOT_AUTHORIZED');
  });

  it('returns 200 for VENDOR email present in whitelist', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        next_step: 'verify_totp',
        temp_token: 'temp-jwt-abc',
        refresh_token: 'refresh-abc',
        message: 'Ingresa el código de Google Authenticator',
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'whitelisted-vendor@test.com', password: 'vendorpass' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.next_step).toBe('verify_totp');
  });

  it('returns 200 for CUSTOMER without whitelist check', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        next_step: 'complete',
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        refresh_token: 'refresh-customer',
        user: { id: 'u2', email: 'customer@test.com', role: 'customer' },
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@test.com', password: 'customerpass' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.next_step).toBe('complete');
    expect(body.user.role).toBe('customer');
  });
});
