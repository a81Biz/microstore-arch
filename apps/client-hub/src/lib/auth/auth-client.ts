import { supabaseClient } from '../supabase-client';

export interface AuthResult {
  success: boolean;
  nextStep?: 'complete';
  user?: {
    id: string;
    email: string;
    role: string;
  };
  message?: string;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { success: false, message: error?.message || 'Error al iniciar sesión' };
  }

  return {
    success: true,
    nextStep: 'complete',
    user: { id: data.user.id, email: data.user.email!, role: 'customer' },
  };
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
  if (error) {
    throw new Error(error.message);
  }
}

export async function syncCartOnLogin(): Promise<void> {
  try {
    const cartJson = localStorage.getItem('cart');
    if (!cartJson) return;

    const cart: Array<{ productId: string; quantity: number }> = JSON.parse(cartJson);
    if (!Array.isArray(cart) || cart.length === 0) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const items = cart.map(item => ({
      product_id: item.productId,
      quantity: item.quantity,
    }));

    await fetch(`${import.meta.env.PUBLIC_API_BASE}/functions/v1/manage-cart/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    });
  } catch {
    // Non-fatal: cart sync failure must not block login
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

