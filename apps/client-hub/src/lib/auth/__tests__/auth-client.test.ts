import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock de import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      PUBLIC_API_BASE: 'http://localhost:54321/functions/v1'
    }
  }
});

describe('Auth Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  describe('signInWithEmail', () => {
    it('debe retornar success true con datos del usuario', async () => {
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

    it('debe retornar success false con mensaje de error', async () => {
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
    it('debe limpiar el token del localStorage', async () => {
      localStorage.setItem('auth_token', 'test-token');

      const { signOut } = await import('../auth-client');
      await signOut();

      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });
});
