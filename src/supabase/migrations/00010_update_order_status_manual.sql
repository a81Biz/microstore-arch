-- Micro-Store Arch: update_order_status_manual
CREATE OR REPLACE FUNCTION public.update_order_status_manual(
  p_order_id UUID,
  p_new_status order_status
)
RETURNS JSONB AS $$
DECLARE
  v_order orders;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF p_new_status = 'delivered' AND v_order.status != 'shipped' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Solo pedidos enviados pueden marcarse como entregados';
  END IF;

  IF p_new_status = 'cancelled' AND v_order.status IN ('shipped', 'delivered') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: No se puede cancelar un pedido enviado o entregado';
  END IF;

  UPDATE orders SET
    status = p_new_status,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'display_id', v_order.display_id,
    'previous_status', v_order.status,
    'new_status', p_new_status,
    'updated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
