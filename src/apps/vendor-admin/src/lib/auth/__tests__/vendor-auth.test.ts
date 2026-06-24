import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.stubGlobal('import', {
  meta: {
    env: {
      PUBLIC_API_BASE: 'http://localhost:54321/functions/v1'
    }
  }
});

describe('Vendor Auth Flow', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('debe manejar el flujo completo: login -> change_password -> setup_totp', async () => {
    // Paso 1: Login detecta que debe cambiar contraseña
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        next_step: 'change_password',
        temp_token: 'temp-token-1',
        message: 'Debes cambiar tu contraseña'
      })
    });

    const { vendorSignIn } = await import('../auth-client');
    const loginResult = await vendorSignIn('admin@tienda.com', 'temp123');

    expect(loginResult.success).toBe(true);
    expect(loginResult.nextStep).toBe('change_password');
    expect(loginResult.tempToken).toBe('temp-token-1');

    // Paso 2: Setup TOTP después del cambio de contraseña
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          secret: 'JBSWY3DPEHPK3PXP',
          otpauth_url: 'otpauth://totp/Micro-Store:admin@tienda.com?secret=JBSWY3DPEHPK3PXP'
        }
      })
    });

    const { setupTOTP } = await import('../auth-client');
    const setupResult = await setupTOTP('temp-token-1');

    expect(setupResult.success).toBe(true);
    expect(setupResult.data?.secret).toBe('JBSWY3DPEHPK3PXP');
  });

  it('debe rechazar código TOTP inválido', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'UNAUTHORIZED',
        message: 'Código TOTP inválido'
      })
    });

    const { verifyTOTP } = await import('../auth-client');
    const result = await verifyTOTP('temp-token', '000000');

    expect(result.success).toBe(false);
    expect(result.message).toContain('inválido');
  });
});
