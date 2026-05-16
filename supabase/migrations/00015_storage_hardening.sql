-- Micro-Store Arch: Configuración de Storage y RLS
-- Versión: 1.0


-- 1. Crear el bucket 'product-images' si no existe
-- La columna 'public' no existe en supabase/postgres:15.8.1.032.
-- El acceso público se controla por RLS (política "Public Read Access" abajo).
INSERT INTO storage.buckets (id, name)
VALUES ('product-images', 'product-images')
ON CONFLICT (id) DO NOTHING;

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

