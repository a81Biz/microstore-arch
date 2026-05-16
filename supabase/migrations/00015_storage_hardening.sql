-- Micro-Store Arch: Configuración de Storage y RLS
-- Versión: 1.0


-- 1. Crear el bucket 'product-images' si no existe
-- db-migrate corre antes de que supabase-storage añada la columna 'public' via su migración
-- interna 8 (add-public-to-buckets). ADD COLUMN IF NOT EXISTS es idempotente: no conflictúa
-- con la migración interna del Storage API cuando esta corre después.
ALTER TABLE storage.buckets
  ADD COLUMN IF NOT EXISTS public BOOLEAN DEFAULT false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Políticas de Seguridad para Storage
-- Lectura pública para cualquier usuario (incluyendo anónimos)
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Escritura solo para el vendor verificado con MFA
CREATE POLICY "Vendor MFA Write Access" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'vendor' 
      AND (auth.jwt()->'user_metadata'->>'mfa_verified') = 'true'
    )
  );

-- Borrado solo para el vendor verificado con MFA
CREATE POLICY "Vendor MFA Delete Access" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'vendor' 
      AND (auth.jwt()->'user_metadata'->>'mfa_verified') = 'true'
    )
  );

