-- Micro-Store Arch: update_item_fulfillment
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

  UPDATE order_items SET
    fulfillment_status = p_new_status
  WHERE id = p_item_id;

  PERFORM update_order_status(v_order_id);

  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'new_status', p_new_status,
    'order_status', (SELECT status FROM orders WHERE id = v_order_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
