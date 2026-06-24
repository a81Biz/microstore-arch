-- Micro-Store Arch: Tabla order_payments + confirm_order_payment actualizado

CREATE TABLE IF NOT EXISTS order_payments (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gateway        payment_gateway NOT NULL,
  transaction_id TEXT          NOT NULL,
  amount_cents   INTEGER       NOT NULL CHECK (amount_cents > 0),
  currency       CHAR(3)       NOT NULL DEFAULT 'MXN',
  paid_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_op_order_id ON order_payments(order_id);

ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON order_payments
  FOR ALL
  USING (auth.role() = 'service_role');

-- confirm_order_payment actualizado: ahora también registra el pago
CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id         UUID,
  p_payment_intent_id TEXT,
  p_payment_method   payment_gateway
)
RETURNS JSONB AS $$
DECLARE
  v_item           RECORD;
  v_is_on_demand   BOOLEAN;
  v_new_status     order_status;
  v_amount_cents   INTEGER;
  v_currency       CHAR(3);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM orders
    WHERE id = p_order_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND_OR_ALREADY_PROCESSED';
  END IF;

  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    SELECT is_on_demand INTO v_is_on_demand
    FROM products WHERE id = v_item.product_id FOR UPDATE;

    IF NOT v_is_on_demand THEN
      UPDATE products
      SET
        stock_quantity   = stock_quantity - v_item.quantity,
        last_stock_change = NOW(),
        updated_at       = NOW()
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

  SELECT update_order_status(p_order_id) INTO v_new_status;

  -- Registrar pago (fallo no revierte — el pago ya está confirmado)
  BEGIN
    SELECT ROUND(total_amount * 100)::INT, currency
    INTO v_amount_cents, v_currency
    FROM orders WHERE id = p_order_id;

    INSERT INTO public.order_payments(order_id, gateway, transaction_id, amount_cents, currency)
    VALUES (p_order_id, p_payment_method, p_payment_intent_id, v_amount_cents, v_currency);
  EXCEPTION WHEN OTHERS THEN
    -- Log implícito via RAISE NOTICE; no bloquear la confirmación
    RAISE NOTICE 'order_payments insert failed for order %: %', p_order_id, SQLERRM;
  END;

  RETURN jsonb_build_object(
    'order_id',          p_order_id,
    'status',            v_new_status,
    'payment_intent_id', p_payment_intent_id,
    'confirmed_at',      NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
