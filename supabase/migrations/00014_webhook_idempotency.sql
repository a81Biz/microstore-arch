-- Micro-Store Arch: Idempotencia de Webhooks
-- Versión: 1.1


CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  gateway payment_gateway NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_gateway ON webhook_logs(gateway);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON webhook_logs(processed_at);

-- RLS: Solo lectura admin
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read webhook logs" ON webhook_logs FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'vendor' 
    AND (auth.jwt()->'user_metadata'->>'mfa_verified') = 'true'
  ));

