import { supabaseClient } from '../supabase-client';

export interface AuthResult {
  success: boolean;
  nextStep?: 'complete' | 'change_password' | 'verify_totp' | 'setup_totp';
  accessToken?: string;
  tempToken?: string;
  message?: string;
}

export async function vendorSignIn(email: string, password: string): Promise<AuthResult> {
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

export async function setupTOTP(tempToken: string) {
  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/setup-totp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_token: tempToken })
  });

  return response.json();
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

  return { success: true, message: result.message || 'TOTP activado' };
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

export async function signOut(): Promise<void> {
  await supabaseClient.auth.signOut();
  localStorage.removeItem('auth_token');
}
