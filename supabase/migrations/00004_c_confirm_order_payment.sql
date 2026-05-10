-- Micro-Store Arch: confirm_order_payment
CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id UUID,
  p_payment_intent_id TEXT,
  p_payment_method payment_gateway
)
RETURNS JSONB AS $$
DECLARE
  v_item RECORD;
  v_product_id UUID;
  v_quantity INTEGER;
  v_is_on_demand BOOLEAN;
  v_new_status order_status;
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

  SELECT update_order_status(p_order_id) INTO v_new_status;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', v_new_status,
    'payment_intent_id', p_payment_intent_id,
    'confirmed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
