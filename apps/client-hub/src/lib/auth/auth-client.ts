import { supabaseClient } from '../supabase-client';

export interface AuthResult {
  success: boolean;
  nextStep?: 'complete' | 'change_password' | 'verify_totp' | 'setup_totp';
  accessToken?: string;
  tempToken?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  message?: string;
}

export interface TOTPSetupData {
  secret: string;
  otpauthUrl: string;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, message: result.message || 'Error al iniciar sesión' };
  }

  return { success: true, ...result };
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return {
    success: true,
    message: 'Revisa tu email para verificar tu cuenta',
    user: data.user ? { id: data.user.id, email: data.user.email!, role: 'customer' } : undefined
  };
}

export async function signOut(): Promise<void> {
  const { error } = await supabaseClient.auth.signOut();
  localStorage.removeItem('auth_token');
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { user, profile };
}

export async function verifyTOTP(tempToken: string, totpCode: string): Promise<AuthResult> {
  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/verify-totp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_token: tempToken, totp_code: totpCode })
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, message: result.message };
  }

  return { success: true, ...result };
}

export async function setupTOTP(tempToken: string): Promise<{ success: boolean; data?: TOTPSetupData; message?: string }> {
  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/setup-totp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_token: tempToken })
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, message: result.message };
  }

  return { success: true, data: result.data };
}

export async function confirmTOTP(tempToken: string, totpCode: string): Promise<AuthResult> {
  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/confirm-totp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_token: tempToken, totp_code: totpCode })
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, message: result.message };
  }

  return { success: true, message: result.message || 'TOTP activado correctamente' };
}

export async function changePassword(tempToken: string, newPassword: string): Promise<AuthResult> {
  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_token: tempToken, new_password: newPassword })
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, message: result.message };
  }

  return { success: true, message: result.message || 'Contraseña actualizada' };
}
