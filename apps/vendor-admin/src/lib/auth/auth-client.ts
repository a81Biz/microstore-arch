import { supabaseClient } from '../supabase-client';
import { API_ROUTES } from '@micro-store/core';

export interface AuthResult {
  success: boolean;
  nextStep?: 'complete' | 'change_password' | 'verify_totp' | 'setup_totp';
  accessToken?: string;
  tempToken?: string;
  refreshToken?: string;
  message?: string;
}

const base = () => import.meta.env.PUBLIC_API_BASE as string;

export async function vendorSignIn(email: string, password: string): Promise<AuthResult> {
  const response = await fetch(`${base()}${API_ROUTES.admin.login}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, message: result.message || 'Error al iniciar sesión' };
  }

  if (result.next_step === 'complete' && result.access_token && result.refresh_token) {
    await supabaseClient.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token
    });
  }

  return {
    success: true,
    nextStep: result.next_step,
    tempToken: result.temp_token,
    refreshToken: result.refresh_token,
    accessToken: result.access_token,
    message: result.message
  };
}

export async function verifyTOTP(tempToken: string, totpCode: string, refreshToken?: string): Promise<AuthResult> {
  const response = await fetch(`${base()}${API_ROUTES.admin.verifyTotp}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_token: tempToken, totp_code: totpCode })
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, message: result.message };
  }

  if (result.access_token && refreshToken) {
    await supabaseClient.auth.setSession({
      access_token: result.access_token,
      refresh_token: refreshToken
    });
  }

  return { success: true, accessToken: result.access_token };
}

export async function setupTOTP(tempToken: string) {
  const response = await fetch(`${base()}${API_ROUTES.admin.setupTotp}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_token: tempToken })
  });

  return response.json();
}

export async function confirmTOTP(tempToken: string, totpCode: string): Promise<AuthResult> {
  const response = await fetch(`${base()}${API_ROUTES.admin.confirmTotp}`, {
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
  const response = await fetch(`${base()}${API_ROUTES.admin.changePassword}`, {
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
}

export async function getVendorAuthHeader(): Promise<string> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session ? `Bearer ${session.access_token}` : '';
}
