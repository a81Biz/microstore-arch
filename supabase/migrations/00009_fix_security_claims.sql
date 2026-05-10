-- Micro-Store Arch: Fix Security Claims
-- Reemplaza user_metadata (mutable por usuario) con app_metadata (solo service role)
-- en todas las políticas RLS y el trigger de storage.

BEGIN;

-- ============================================================
-- 1. Fix RLS en tabla products
-- ============================================================
DROP POLICY IF EXISTS "Admin can manage products" ON products;

CREATE POLICY "Admin can manage products" ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'vendor'
        AND (auth.jwt()->'app_metadata'->>'mfa_verified')::boolean = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'vendor'
        AND (auth.jwt()->'app_metadata'->>'mfa_verified')::boolean = true
    )
  );

-- ============================================================
-- 2. Fix RLS en tabla orders
-- ============================================================
DROP POLICY IF EXISTS "Admin can read all orders" ON orders;
DROP POLICY IF EXISTS "Admin can manage orders" ON orders;

CREATE POLICY "Admin can read all orders" ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'vendor'
        AND (auth.jwt()->'app_metadata'->>'mfa_verified')::boolean = true
    )
  );

CREATE POLICY "Admin can manage orders" ON orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'vendor'
        AND (auth.jwt()->'app_metadata'->>'mfa_verified')::boolean = true
    )
  );

-- ============================================================
-- 3. Fix RLS en tabla order_items
-- ============================================================
DROP POLICY IF EXISTS "Admin can manage order items" ON order_items;

CREATE POLICY "Admin can manage order items" ON order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'vendor'
        AND (auth.jwt()->'app_metadata'->>'mfa_verified')::boolean = true
    )
  );

-- ============================================================
-- 4. Fix RLS en webhook_logs (migration 00006)
-- ============================================================
DROP POLICY IF EXISTS "Admin can read webhook logs" ON webhook_logs;

CREATE POLICY "Admin can read webhook logs" ON webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'vendor'
        AND (auth.jwt()->'app_metadata'->>'mfa_verified')::boolean = true
    )
  );

-- ============================================================
-- 5. Fix políticas de Storage (migration 00007)
-- ============================================================
DROP POLICY IF EXISTS "Vendor MFA Write Access" ON storage.objects;
DROP POLICY IF EXISTS "Vendor MFA Delete Access" ON storage.objects;

CREATE POLICY "Vendor MFA Write Access" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'vendor'
        AND (auth.jwt()->'app_metadata'->>'mfa_verified')::boolean = true
    )
  );

CREATE POLICY "Vendor MFA Delete Access" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'vendor'
        AND (auth.jwt()->'app_metadata'->>'mfa_verified')::boolean = true
    )
  );

COMMIT;
