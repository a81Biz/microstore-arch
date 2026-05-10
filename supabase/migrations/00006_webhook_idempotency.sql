-- Micro-Store Arch: Idempotencia de Webhooks
-- Versión: 1.0

BEGIN;

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  gateway payment_gateway NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  metadata JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Solo lectura admin
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can read webhook logs" ON webhook_logs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor' AND (auth.jwt()->'user_metadata'->>'mfa_verified') = 'true'));

COMMIT;
