-- Micro-Store Arch: search_orders
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
