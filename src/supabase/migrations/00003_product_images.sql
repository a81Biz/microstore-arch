-- Micro-Store Arch: Storage y Funciones de Productos
-- Versión: 1.0


-- 1. Políticas de Storage para imágenes de productos
-- (Asumiendo que el bucket 'product-images' ya existe o se crea via Dashboard)

-- 2. Función para obtener productos visibles (catálogo público)
CREATE OR REPLACE FUNCTION public.get_visible_products()
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
    SELECT *
    FROM products
    WHERE is_visible = true
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función atómica para actualizar stock
CREATE OR REPLACE FUNCTION public.update_product_stock(
  p_product_id UUID,
  p_new_stock INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET 
    stock_quantity = p_new_stock,
    last_stock_change = NOW(),
    updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para crear producto con slug único automático
CREATE OR REPLACE FUNCTION public.create_product(
  p_name TEXT,
  p_description TEXT,
  p_price DECIMAL(10,2),
  p_stock_quantity INTEGER,
  p_is_on_demand BOOLEAN,
  p_is_visible BOOLEAN
)
RETURNS products AS $$
DECLARE
  v_slug TEXT;
  v_product products;
  v_counter INTEGER := 0;
BEGIN
  -- Generar slug base desde el nombre
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '-', 'g'));
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(v_slug, '-');
  
  -- Verificar unicidad y agregar sufijo si es necesario
  LOOP
    IF v_counter > 0 THEN
      v_slug := v_slug || '-' || v_counter::TEXT;
    END IF;
    
    BEGIN
      INSERT INTO products (
        slug, name, description, price, 
        stock_quantity, is_on_demand, is_visible
      ) VALUES (
        v_slug, p_name, p_description, p_price,
        p_stock_quantity, p_is_on_demand, p_is_visible
      )
      RETURNING * INTO v_product;
      
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_counter := v_counter + 1;
      IF v_counter > 100 THEN
        RAISE EXCEPTION 'No se pudo generar un slug único';
      END IF;
    END;
  END LOOP;
  
  RETURN v_product;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para notificar cambios de stock (usado por webhooks)
CREATE OR REPLACE FUNCTION public.notify_product_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar cambio para posible rebuild del storefront
  IF (TG_OP = 'UPDATE' AND (
    NEW.price != OLD.price OR 
    NEW.stock_quantity != OLD.stock_quantity OR 
    NEW.is_visible != OLD.is_visible OR
    NEW.is_on_demand != OLD.is_on_demand
  )) OR TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    -- Actualizar timestamp de cambio
    NEW.last_stock_change = NOW();
    
    -- Enviar notificación (Supabase Realtime)
    PERFORM pg_notify('product_changes', json_build_object(
      'product_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'timestamp', NOW()
    )::TEXT);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_product_change ON products;
CREATE TRIGGER on_product_change
  BEFORE INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION notify_product_change();

