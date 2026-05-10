-- Micro-Store Arch: Fix Order Cancellation Stock Restoration
-- Al cancelar una orden con estado paid/in_production, restaura el stock
-- de los ítems que ya habían sido reservados (fulfillment_status = 'reserved').


CREATE OR REPLACE FUNCTION public.update_order_status_manual(
  p_order_id UUID,
  p_new_status order_status
)
RETURNS JSONB AS $$
DECLARE
  v_order orders;
  v_previous_status order_status;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  v_previous_status := v_order.status;

  -- Validar transiciones de estado permitidas
  IF p_new_status = 'delivered' AND v_order.status != 'shipped' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Solo pedidos enviados pueden marcarse como entregados';
  END IF;

  IF p_new_status = 'cancelled' AND v_order.status IN ('shipped', 'delivered') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: No se puede cancelar un pedido enviado o entregado';
  END IF;

  -- Si se cancela una orden pagada/en producción, restaurar stock reservado
  IF p_new_status = 'cancelled' AND v_order.status IN ('paid', 'in_production') THEN
    FOR v_item IN
      SELECT oi.product_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = p_order_id
        AND oi.fulfillment_status = 'reserved'
    LOOP
      UPDATE products
      SET
        stock_quantity = stock_quantity + v_item.quantity,
        last_stock_change = NOW(),
        updated_at = NOW()
      WHERE id = v_item.product_id;
    END LOOP;

    -- Actualizar estado de ítems a cancelled
    UPDATE order_items
    SET fulfillment_status = 'pending'
    WHERE order_id = p_order_id;
  END IF;

  -- Actualizar estado de la orden
  UPDATE orders SET
    status = p_new_status,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'display_id', v_order.display_id,
    'previous_status', v_previous_status,
    'new_status', p_new_status,
    'updated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_order_status_manual IS
  'Actualiza el estado de una orden con validación de transiciones. '
  'Al cancelar órdenes pagadas/en producción, restaura automáticamente el stock reservado.';

