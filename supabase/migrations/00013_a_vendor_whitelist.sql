-- Micro-Store Arch: Vendor Whitelist Tables y Policies
CREATE TABLE IF NOT EXISTS vendor_whitelist (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO vendor_whitelist (email)
VALUES ('admin@tienda.com')
ON CONFLICT DO NOTHING;

ALTER TABLE vendor_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON vendor_whitelist
  USING (false)
  WITH CHECK (false);
