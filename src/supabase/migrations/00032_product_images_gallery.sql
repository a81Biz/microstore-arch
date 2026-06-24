-- Migration 00032: Product images gallery
-- Adds product_images table for multi-image support (max 10 per product)

CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  alt_text    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id, sort_order);

-- RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Public read: storefront can query via anon key when product is visible
CREATE POLICY "Public read product_images"
  ON product_images FOR SELECT USING (
    EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.is_visible = true)
  );

-- Vendor write: second security layer (primary validation in Edge Function)
CREATE POLICY "Vendor write product_images"
  ON product_images FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'vendor'
    )
  );
