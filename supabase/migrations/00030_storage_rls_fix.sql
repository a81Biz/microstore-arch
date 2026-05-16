-- Salvaguarda retrospectiva: corrige public = false en entornos donde 00015 ya corrió.
-- En arranques limpios (down -v), 00015 ya inserta con public = true (fix principal).
UPDATE storage.buckets SET public = true WHERE id = 'product-images';

-- PT-FIX-025: Reemplaza políticas RLS de Storage que exigían mfa_verified.
-- En dev local (DISABLE_TOTP=true) el claim nunca se establece → 42501 → 400.
-- MFA ya es enforced en la Edge Function manage-products via requireAdminMFA().
-- La RLS solo necesita verificar que el usuario es un vendor autenticado.

DROP POLICY IF EXISTS "Vendor MFA Write Access" ON storage.objects;
DROP POLICY IF EXISTS "Vendor MFA Delete Access" ON storage.objects;

CREATE POLICY "Vendor Write Access" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'vendor'
    )
  );

CREATE POLICY "Vendor Delete Access" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'vendor'
    )
  );
