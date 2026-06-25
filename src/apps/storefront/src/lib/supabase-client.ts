import { createClient } from '@supabase/supabase-js';

// SSR (Docker): SUPABASE_URL = http://supabase-kong:8000 (internal network)
// Browser: SUPABASE_URL is undefined → falls back to PUBLIC_SUPABASE_URL = http://api.localhost
const supabaseUrl = import.meta.env.SUPABASE_URL
  || import.meta.env.PUBLIC_SUPABASE_URL
  || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'build-placeholder';

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // Storefront es SSG, no necesita persistencia de sesión por defecto
  }
});
