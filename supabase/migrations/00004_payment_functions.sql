-- Micro-Store Arch: Funciones y Procedimientos de Pago
-- Versión: 1.0


-- 1. Extensión para encriptación (pgcrypto es estándar y siempre disponible en Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Función atómica para crear orden con validación de stock
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
  -- 1. Validar stock para cada ítem (bloqueo pesimista)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    
    -- Bloquear fila del producto
    SELECT is_on_demand, stock_quantity, price
    INTO v_is_on_demand, v_stock_quantity, v_unit_price
    FROM products
    WHERE id = v_product_id
    FOR UPDATE;
    
    -- Validar disponibilidad
    IF NOT v_is_on_demand AND v_stock_quantity < v_quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_product_id;
    END IF;
    
    -- Acumular total
    v_total := v_total + (v_unit_price * v_quantity);
  END LOOP;
  
  -- 2. Crear orden
  v_display_id := generate_order_display_id();
  
  INSERT INTO orders (
    display_id, customer_id, status, 
    shipping_address, total_amount, currency
  ) VALUES (
    v_display_id, p_customer_id, v_order_status,
    p_shipping_address, v_total, 'MXN'
  )
  RETURNING id INTO v_order_id;
  
  -- 3. Crear ítems de la orden
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
  
  -- 4. Retornar resultado
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'display_id', v_display_id,
    'total_amount', v_total,
    'currency', 'MXN',
    'status', v_order_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para confirmar pago y reservar stock
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
  -- 1. Verificar que la orden existe y está pendiente
  IF NOT EXISTS (
    SELECT 1 FROM orders 
    WHERE id = p_order_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND_OR_ALREADY_PROCESSED';
  END IF;
  
  -- 2. Procesar cada ítem
  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    -- Bloquear producto
    SELECT is_on_demand INTO v_is_on_demand
    FROM products WHERE id = v_item.product_id FOR UPDATE;
    
    IF NOT v_is_on_demand THEN
      -- Reservar stock físico
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
      -- Marcar para producción
      UPDATE order_items 
      SET fulfillment_status = 'in_production'
      WHERE id = v_item.id;
    END IF;
  END LOOP;
  
  -- 3. Calcular nuevo estado
  SELECT update_order_status(p_order_id) INTO v_new_status;
  
  -- 4. Guardar referencia de pago (en metadata de la orden)
  -- En producción, crearías una tabla payment_transactions
  
  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', v_new_status,
    'payment_intent_id', p_payment_intent_id,
    'confirmed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para encriptar credenciales de pago
-- Usa pgcrypto (pgp_sym_encrypt) — incluye IV en el ciphertext, sin almacenamiento externo de nonce
CREATE OR REPLACE FUNCTION public.save_payment_credentials(
  p_vendor_id UUID,
  p_gateway payment_gateway,
  p_credentials JSONB
)
RETURNS VOID AS $$
DECLARE
  v_key TEXT;
  v_encrypted BYTEA;
BEGIN
  v_key := current_setting('app.settings.encryption_key', true);

  IF v_key IS NULL OR length(v_key) < 32 THEN
    RAISE EXCEPTION 'ENCRYPTION_KEY_NOT_CONFIGURED: La clave debe tener al menos 32 caracteres';
  END IF;

  v_encrypted := pgp_sym_encrypt(
    p_credentials::TEXT,
    v_key,
    'compress-algo=0, cipher-algo=aes256'
  );

  INSERT INTO payment_credentials (
    vendor_id, gateway, is_enabled, credentials_encrypted
  ) VALUES (
    p_vendor_id, p_gateway, TRUE, v_encrypted
  )
  ON CONFLICT (vendor_id, gateway)
  DO UPDATE SET
    credentials_encrypted = v_encrypted,
    last_rotated_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para obtener métodos de pago activos (para el checkout)
CREATE OR REPLACE FUNCTION public.get_active_payment_methods()
RETURNS TABLE (
  gateway payment_gateway,
  is_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
    SELECT pc.gateway, pc.is_enabled
    FROM payment_credentials pc
    WHERE pc.is_enabled = TRUE
    ORDER BY pc.gateway;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

