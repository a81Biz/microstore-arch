-- Micro-Store Arch: Funciones de Gestión de Pedidos
-- Versión: 1.0


-- 1. Función para actualizar tracking y estado de envío
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
  -- Verificar que la orden existe
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;
  
  -- Verificar que todos los ítems están listos para enviar
  SELECT BOOL_AND(fulfillment_status IN ('reserved', 'in_production', 'ready_to_ship'))
  INTO v_all_items_ready
  FROM order_items
  WHERE order_id = p_order_id;
  
  -- Actualizar tracking y estado
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
  
  -- Actualizar ítems a shipped
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

-- 2. Función para cambiar estado manualmente (admin)
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
  
  -- Validar transiciones de estado permitidas
  IF p_new_status = 'delivered' AND v_order.status != 'shipped' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Solo pedidos enviados pueden marcarse como entregados';
  END IF;
  
  IF p_new_status = 'cancelled' AND v_order.status IN ('shipped', 'delivered') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: No se puede cancelar un pedido enviado o entregado';
  END IF;
  
  -- Actualizar estado
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

-- 3. Función para actualizar estado de ítems individuales
CREATE OR REPLACE FUNCTION public.update_item_fulfillment(
  p_item_id UUID,
  p_new_status item_fulfillment_status
)
RETURNS JSONB AS $$
DECLARE
  v_item order_items;
  v_order_id UUID;
BEGIN
  SELECT * INTO v_item
  FROM order_items
  WHERE id = p_item_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND';
  END IF;
  
  v_order_id := v_item.order_id;
  
  -- Actualizar estado del ítem
  UPDATE order_items SET
    fulfillment_status = p_new_status
  WHERE id = p_item_id;
  
  -- Recalcular estado de la orden
  PERFORM update_order_status(v_order_id);
  
  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'new_status', p_new_status,
    'order_status', (SELECT status FROM orders WHERE id = v_order_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para búsqueda de pedidos (admin)
CREATE OR REPLACE FUNCTION public.search_orders(
  p_status order_status DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  display_id TEXT,
  customer_email TEXT,
  status order_status,
  total_amount DECIMAL(10,2),
  currency TEXT,
  tracking_id TEXT,
  carrier TEXT,
  items_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
    SELECT 
      o.id,
      o.display_id,
      p.email AS customer_email,
      o.status,
      o.total_amount,
      o.currency,
      o.tracking_id,
      o.carrier,
      COUNT(oi.id) AS items_count,
      o.created_at
    FROM orders o
    JOIN profiles p ON o.customer_id = p.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE 
      (p_status IS NULL OR o.status = p_status)
      AND (p_search IS NULL OR o.display_id ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
      AND (p_date_from IS NULL OR o.created_at >= p_date_from)
      AND (p_date_to IS NULL OR o.created_at <= p_date_to)
    GROUP BY o.id, o.display_id, p.email, o.status, o.total_amount, o.currency, o.tracking_id, o.carrier, o.created_at
    ORDER BY o.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Política RLS adicional para realtime
-- Permitir que el cliente se suscriba a cambios en sus propios pedidos
CREATE POLICY "Customers can subscribe to own orders" ON orders
  FOR SELECT
  USING (customer_id = auth.uid());

