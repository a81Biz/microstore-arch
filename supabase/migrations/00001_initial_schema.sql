-- Micro-Store Arch: Migración Inicial
-- Versión: 1.0


-- 1. Tipos ENUM
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'vendor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE item_fulfillment_status AS ENUM ('pending', 'reserved', 'in_production', 'ready_to_ship', 'shipped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_gateway AS ENUM ('stripe', 'paypal', 'mercadopago', 'hey_banco');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Secuencias
CREATE SEQUENCE IF NOT EXISTS order_display_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- 3. Funciones Helper
CREATE OR REPLACE FUNCTION generate_order_display_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TX-' || to_char(NOW(), 'YYYY') || '-' || to_char(NEXTVAL('order_display_id_seq'), 'FM000000');
END;
$$ LANGUAGE plpgsql;

-- 4. Tablas
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role user_role DEFAULT 'customer' NOT NULL,
  totp_secret TEXT,
  totp_enabled BOOLEAN DEFAULT FALSE,
  password_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  is_on_demand BOOLEAN DEFAULT FALSE NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  last_stock_change TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_last_stock_change ON products(last_stock_change);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT UNIQUE NOT NULL DEFAULT generate_order_display_id(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  status order_status DEFAULT 'pending' NOT NULL,
  shipping_address JSONB NOT NULL CHECK (
    shipping_address ? 'street' AND 
    shipping_address ? 'city' AND 
    shipping_address ? 'postal_code' AND 
    shipping_address ? 'country'
  ),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  currency TEXT DEFAULT 'MXN' NOT NULL,
  tracking_id TEXT,
  carrier TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON orders(customer_id, status);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  fulfillment_status item_fulfillment_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES profiles(id),
  gateway payment_gateway NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  credentials_encrypted BYTEA NOT NULL,
  last_rotated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, gateway)
);

-- 5. Función de Estado de Pedido
CREATE OR REPLACE FUNCTION update_order_status(p_order_id UUID)
RETURNS order_status AS $$
DECLARE
  v_status order_status;
  v_all_shipped BOOLEAN;
  v_all_production BOOLEAN;
  v_any_pending BOOLEAN;
BEGIN
  SELECT 
    BOOL_AND(fulfillment_status = 'shipped'),
    BOOL_AND(fulfillment_status IN ('in_production', 'ready_to_ship', 'shipped')),
    BOOL_OR(fulfillment_status IN ('pending', 'reserved'))
  INTO v_all_shipped, v_all_production, v_any_pending
  FROM order_items WHERE order_id = p_order_id;
  
  IF v_all_shipped THEN
    v_status := 'shipped';
  ELSIF v_all_production THEN
    v_status := 'in_production';
  ELSIF v_any_pending THEN
    v_status := 'paid';
  ELSE
    v_status := 'paid';
  END IF;
  
  UPDATE orders SET status = v_status, updated_at = NOW() WHERE id = p_order_id;
  RETURN v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_credentials ENABLE ROW LEVEL SECURITY;

-- Políticas: profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own non-sensitive fields" ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (id = auth.uid());

-- Políticas: products (lectura pública, escritura admin con MFA)
CREATE POLICY "Public can read visible products" ON products FOR SELECT USING (is_visible = true);
CREATE POLICY "Admin can manage products" ON products FOR ALL 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor' AND (auth.jwt()->>'user_metadata')::jsonb ->> 'mfa_verified' = 'true'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor' AND (auth.jwt()->>'user_metadata')::jsonb ->> 'mfa_verified' = 'true'));

-- Políticas: orders (cliente ve sus pedidos, admin ve todos con MFA)
CREATE POLICY "Customers can read own orders" ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Admin can read all orders" ON orders FOR SELECT 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor' AND (auth.jwt()->>'user_metadata')::jsonb ->> 'mfa_verified' = 'true'));
CREATE POLICY "Admin can manage orders" ON orders FOR ALL 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor' AND (auth.jwt()->>'user_metadata')::jsonb ->> 'mfa_verified' = 'true'));

-- Políticas: order_items (hereda de orders vía relación)
CREATE POLICY "Customers can read own order items" ON order_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid()));
CREATE POLICY "Admin can manage order items" ON order_items FOR ALL 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor' AND (auth.jwt()->>'user_metadata')::jsonb ->> 'mfa_verified' = 'true'));

-- Políticas: payment_credentials (denegar acceso directo)
CREATE POLICY "Deny all client access to payment_credentials" ON payment_credentials FOR ALL USING (FALSE);

-- 7. Seed Data
INSERT INTO products (slug, name, description, price, stock_quantity, is_on_demand, is_visible) VALUES
('camiseta-algodon-organico', 'Camiseta Algodón Orgánico', 'Camiseta 100% algodón orgánico certificado', 29.99, 50, false, true),
('taza-ceramica-artesanal', 'Taza Cerámica Artesanal', 'Taza hecha a mano por artesanos locales', 19.99, 10, false, true),
('poster-diseno-personalizado', 'Poster Diseño Personalizado', 'Poster impreso bajo demanda con tu diseño', 24.99, 0, true, true),
('gorra-bordada', 'Gorra Bordada', 'Gorra con bordado de alta calidad', 34.99, 0, false, false),
('libreta-reciclada', 'Libreta Reciclada', 'Libreta artesanal con papel reciclado', 14.99, 25, false, true)
ON CONFLICT (slug) DO NOTHING;

