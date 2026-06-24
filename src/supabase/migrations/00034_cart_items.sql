-- Migration: 00034_cart_items
-- Persistent cart for authenticated users.
-- Cart sync strategy: UPSERT on (user_id, product_id) using GREATEST(qty).

CREATE TABLE cart_items (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INT         NOT NULL CHECK (quantity > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner access only"
  ON cart_items
  FOR ALL
  USING (auth.uid() = user_id);
