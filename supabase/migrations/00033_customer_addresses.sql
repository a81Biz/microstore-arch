-- Migration: 00033_customer_addresses
-- Creates customer_addresses table with RLS and single-default trigger.

CREATE TABLE customer_addresses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label        TEXT        NOT NULL CHECK (label IN ('home', 'office', 'other')),
  street       TEXT        NOT NULL,
  city         TEXT        NOT NULL,
  postal_code  TEXT        NOT NULL,
  country      CHAR(2)     NOT NULL,
  is_default   BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_addresses_user_id ON customer_addresses(user_id);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner access only"
  ON customer_addresses
  FOR ALL
  USING (auth.uid() = user_id);

-- Ensures only one address per user can have is_default = true.
CREATE OR REPLACE FUNCTION enforce_single_default_address()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE customer_addresses
     SET is_default = false
   WHERE user_id = NEW.user_id
     AND id <> NEW.id
     AND is_default = true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_default_address
  AFTER INSERT OR UPDATE OF is_default
  ON customer_addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_address();
