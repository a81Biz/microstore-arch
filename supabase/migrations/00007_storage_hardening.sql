-- Micro-Store Arch: Configuración de Storage y RLS
-- Versión: 1.0

BEGIN;

-- 1. Crear el bucket 'product-images' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
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

COMMIT;
