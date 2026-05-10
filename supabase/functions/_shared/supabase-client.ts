import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const getSupabaseClient = (authHeader?: string) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  return createClient(url, key, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
};

export const getSupabaseAdmin = () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  return createClient(url, key);
};
