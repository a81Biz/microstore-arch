-- Micro-Store Arch: Realtime subscription policy for customers
CREATE POLICY "Customers can subscribe to own orders" ON orders
  FOR SELECT
  USING (customer_id = auth.uid());
