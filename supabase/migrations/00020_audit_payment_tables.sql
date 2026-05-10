-- Micro-Store Arch: Audit Logs y Payment Transactions
-- Agrega trazabilidad completa de operaciones críticas y ciclo de vida de pagos.


-- ============================================================
-- 1. Tabla audit_logs — registro inmutable de operaciones críticas
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo lectura para vendors con MFA — escritura solo via service role
CREATE POLICY "Admin can read audit logs" ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'vendor'
        AND (auth.jwt()->'app_metadata'->>'mfa_verified')::boolean = true
    )
  );

-- ============================================================
-- 2. Tabla payment_transactions — ciclo de vida completo del pago
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gateway payment_gateway NOT NULL,
  gateway_transaction_id TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'MXN',
  status TEXT NOT NULL CHECK (status IN ('initiated', 'pending', 'captured', 'failed', 'refunded', 'partially_refunded')),
  error_code TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_gateway_id ON payment_transactions(gateway, gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Clientes pueden ver sus propias transacciones (via orden)
CREATE POLICY "Customers can read own payment transactions" ON payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payment_transactions.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- Vendors con MFA ven todas las transacciones
CREATE POLICY "Admin can read all payment transactions" ON payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'vendor'
        AND (auth.jwt()->'app_metadata'->>'mfa_verified')::boolean = true
    )
  );

-- ============================================================
-- 3. Actualizar confirm_order_payment para registrar transacción
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id UUID,
  p_payment_intent_id TEXT,
  p_payment_method payment_gateway
)
RETURNS JSONB AS $$
DECLARE
  v_item RECORD;
  v_is_on_demand BOOLEAN;
  v_new_status order_status;
  v_order orders;
BEGIN
  -- 1. Verificar que la orden existe y está pendiente
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order.status != 'pending' THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND_OR_ALREADY_PROCESSED';
  END IF;

  -- 2. Procesar cada ítem
  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    SELECT is_on_demand INTO v_is_on_demand
    FROM products WHERE id = v_item.product_id FOR UPDATE;

    IF NOT v_is_on_demand THEN
      UPDATE products
      SET
        stock_quantity = stock_quantity - v_item.quantity,
        last_stock_change = NOW(),
        updated_at = NOW()
      WHERE id = v_item.product_id;

      UPDATE order_items
      SET fulfillment_status = 'reserved'
      WHERE id = v_item.id;
    ELSE
      UPDATE order_items
      SET fulfillment_status = 'in_production'
      WHERE id = v_item.id;
    END IF;
  END LOOP;

  -- 3. Calcular nuevo estado
  SELECT update_order_status(p_order_id) INTO v_new_status;

  -- 4. Registrar transacción de pago
  INSERT INTO payment_transactions (
    order_id, gateway, gateway_transaction_id,
    amount, currency, status
  ) VALUES (
    p_order_id, p_payment_method, p_payment_intent_id,
    v_order.total_amount, v_order.currency, 'captured'
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', v_new_status,
    'payment_intent_id', p_payment_intent_id,
    'confirmed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

