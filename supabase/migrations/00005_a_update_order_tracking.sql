-- Micro-Store Arch: update_order_tracking
CREATE OR REPLACE FUNCTION public.update_order_tracking(
  p_order_id UUID,
  p_tracking_id TEXT,
  p_carrier TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_order orders;
  v_all_items_ready BOOLEAN;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  SELECT BOOL_AND(fulfillment_status IN ('reserved', 'in_production', 'ready_to_ship'))
  INTO v_all_items_ready
  FROM order_items
  WHERE order_id = p_order_id;

  UPDATE orders SET
    tracking_id = p_tracking_id,
    carrier = p_carrier,
    status = CASE
      WHEN v_all_items_ready THEN 'shipped'::order_status
      ELSE status
    END,
    shipped_at = CASE
      WHEN v_all_items_ready THEN NOW()
      ELSE shipped_at
    END,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  IF v_all_items_ready THEN
    UPDATE order_items
    SET fulfillment_status = 'shipped'
    WHERE order_id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'display_id', v_order.display_id,
    'status', v_order.status,
    'tracking_id', v_order.tracking_id,
    'carrier', v_order.carrier,
    'shipped_at', v_order.shipped_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
