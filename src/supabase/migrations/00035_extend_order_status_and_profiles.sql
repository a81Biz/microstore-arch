-- Micro-Store Arch: Nuevos estados de orden + columnas name/phone en profiles
-- NOTA: ALTER TYPE ADD VALUE no puede ejecutarse dentro de BEGIN/COMMIT en PG 14

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'packaged' AFTER 'in_production';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'in_transit' AFTER 'shipped';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS name  TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Función: sincronizar name/phone desde auth.users.raw_user_meta_data → profiles
CREATE OR REPLACE FUNCTION public.sync_profile_meta()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    name  = COALESCE(NEW.raw_user_meta_data->>'name',  name),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_meta ON auth.users;
CREATE TRIGGER trg_sync_profile_meta
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_meta();
