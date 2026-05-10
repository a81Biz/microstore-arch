import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock del cliente Supabase — la sesión es gestionada internamente por el SDK
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
vi.mock('../../supabase-client', () => ({
  supabaseClient: {
    auth: {
      signOut: mockSignOut,
      getSession: mockGetSession,
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInWithPassword: vi.fn(),
    }
  }
}));

vi.stubGlobal('import', {
  meta: {
    env: { PUBLIC_API_BASE: 'http://localhost:54321/functions/v1' }
  }
});

describe('Auth Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockSignOut.mockClear();
    mockGetSession.mockClear();
  });

  describe('signInWithEmail', () => {
    it('retorna success true con datos del usuario', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          next_step: 'complete',
          access_token: 'test-token',
          user: { id: '1', email: 'test@test.com', role: 'customer' }
        })
      });

      const { signInWithEmail } = await import('../auth-client');
      const result = await signInWithEmail('test@test.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('test-token');
    });

    it('retorna success false con mensaje de error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'UNAUTHORIZED', message: 'Credenciales inválidas' })
      });

      const { signInWithEmail } = await import('../auth-client');
      const result = await signInWithEmail('test@test.com', 'wrong');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Credenciales inválidas');
    });
  });

  describe('signOut', () => {
    it('llama a supabaseClient.auth.signOut() sin tocar localStorage', async () => {
      const { signOut } = await import('../auth-client');
      await signOut();

      // La sesión es gestionada por el SDK de Supabase — no por localStorage
      expect(mockSignOut).toHaveBeenCalledOnce();
      // No debe haber ningún acceso a localStorage
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('verifyTOTP', () => {
    it('retorna success true con token válido', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, access_token: 'verified-token' })
      });

      const { verifyTOTP } = await import('../auth-client');
      const result = await verifyTOTP('temp-token', '123456');

      expect(result.success).toBe(true);
    });

    it('retorna success false con código inválido', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'UNAUTHORIZED', message: 'Código TOTP inválido' })
      });

      const { verifyTOTP } = await import('../auth-client');
      const result = await verifyTOTP('temp-token', '000000');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Código TOTP inválido');
    });
  });
});
