-- Micro-Store Arch: create_order_atomic
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_customer_id UUID,
  p_shipping_address JSONB,
  p_items JSONB,
  p_payment_method payment_gateway,
  p_payment_intent_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_display_id TEXT;
  v_total DECIMAL(10,2) := 0;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_unit_price DECIMAL(10,2);
  v_is_on_demand BOOLEAN;
  v_stock_quantity INTEGER;
  v_order_status order_status := 'pending';
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT is_on_demand, stock_quantity, price
    INTO v_is_on_demand, v_stock_quantity, v_unit_price
    FROM products
    WHERE id = v_product_id
    FOR UPDATE;

    IF v_unit_price IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', v_product_id;
    END IF;

    IF NOT v_is_on_demand AND v_stock_quantity < v_quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_product_id;
    END IF;

    v_total := v_total + (v_unit_price * v_quantity);
  END LOOP;

  v_display_id := generate_order_display_id();

  INSERT INTO orders (
    display_id, customer_id, status,
    shipping_address, total_amount, currency
  ) VALUES (
    v_display_id, p_customer_id, v_order_status,
    p_shipping_address, v_total, 'MXN'
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT price INTO v_unit_price
    FROM products WHERE id = v_product_id;

    INSERT INTO order_items (
      order_id, product_id, quantity, unit_price, fulfillment_status
    ) VALUES (
      v_order_id, v_product_id, v_quantity, v_unit_price, 'pending'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'display_id', v_display_id,
    'total_amount', v_total,
    'currency', 'MXN',
    'status', v_order_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
