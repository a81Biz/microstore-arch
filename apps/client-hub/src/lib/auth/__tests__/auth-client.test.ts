import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn().mockResolvedValue({ error: null });
const mockSignUp = vi.fn().mockResolvedValue({ data: { user: null }, error: null });
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });

// Supabase mock — la sesión es gestionada internamente por el SDK
vi.mock('../../supabase-client', () => ({
  supabaseClient: {
    auth: {
      signOut: mockSignOut,
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
      signUp: mockSignUp,
      getUser: mockGetUser,
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }
}));

// window.location no existe en Node — stub mínimo
Object.defineProperty(globalThis, 'window', {
  value: { location: { origin: 'http://localhost' } },
  writable: true,
});

describe('Auth Client', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
    mockSignInWithPassword.mockReset();
    mockSignUp.mockReset();
    mockGetUser.mockReset();
  });

  describe('signInWithEmail', () => {
    it('retorna success true y establece sesión Supabase con credenciales válidas', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: '1', email: 'test@test.com' }, session: {} },
        error: null,
      });

      const { signInWithEmail } = await import('../auth-client');
      const result = await signInWithEmail('test@test.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.nextStep).toBe('complete');
      expect(result.user?.email).toBe('test@test.com');
      expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' });
    });

    it('retorna success false con mensaje de error al fallar credenciales', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const { signInWithEmail } = await import('../auth-client');
      const result = await signInWithEmail('test@test.com', 'wrong');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid login credentials');
    });
  });

  describe('signOut', () => {
    it('delega en supabaseClient.auth.signOut() sin manipular tokens manualmente', async () => {
      const { signOut } = await import('../auth-client');
      await signOut();
      // La sesión es gestionada por el SDK — no por localStorage manual
      expect(mockSignOut).toHaveBeenCalledOnce();
    });
  });

  describe('signUpWithEmail', () => {
    it('retorna success true con mensaje de verificación', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: { id: '2', email: 'nuevo@test.com' } },
        error: null,
      });

      const { signUpWithEmail } = await import('../auth-client');
      const result = await signUpWithEmail('nuevo@test.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('email');
    });

    it('retorna success false si Supabase devuelve error', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'User already registered' },
      });

      const { signUpWithEmail } = await import('../auth-client');
      const result = await signUpWithEmail('existe@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User already registered');
    });
  });
});
