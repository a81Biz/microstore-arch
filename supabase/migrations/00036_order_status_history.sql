-- Micro-Store Arch: Historial de cambios de estado de pedidos

CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status   order_status NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_osh_order_id ON order_status_history(order_id, changed_at);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede leer (info interna de negocio)
CREATE POLICY "Service role only"
  ON order_status_history
  FOR ALL
  USING (auth.role() = 'service_role');

-- Función que registra el cambio en el historial
CREATE OR REPLACE FUNCTION public.record_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.order_status_history(order_id, from_status, to_status)
  VALUES (NEW.id, OLD.status, NEW.status);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_record_order_status_change ON orders;
CREATE TRIGGER trg_record_order_status_change
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.record_order_status_change();
