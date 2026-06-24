-- Prerequisito: auth.jwt() no está incluida en supabase/postgres self-hosted.
-- Supabase Cloud la inyecta automáticamente; aquí la definimos explícitamente
-- para que las políticas RLS que la referencian puedan compilarse.
-- Coherente con auth.uid() que lee current_setting('request.jwt.claim.sub').
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
  LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb
$$;
