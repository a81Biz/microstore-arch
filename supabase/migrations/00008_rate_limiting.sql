-- Micro-Store Arch: Rate Limiting (SQL Pure / Cost $0)
-- Versión: 1.1

BEGIN;

DROP TABLE IF EXISTS rate_limits;

CREATE TABLE rate_limits (
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (identifier, endpoint)
);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT, 
  p_endpoint TEXT, 
  p_limit INTEGER, 
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 1. Limpia ventanas expiradas para el identificador/endpoint específico
  -- Nota: En producción, podrías querer un cron job, pero aquí lo hacemos per-request
  -- para mantener la simplicidad y el costo $0.
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- 2. Inserta o incrementa
  INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, NOW())
  ON CONFLICT (identifier, endpoint) DO UPDATE
  SET request_count = rate_limits.request_count + 1,
      window_start = CASE 
                       WHEN rate_limits.request_count >= p_limit 
                       THEN NOW() - (p_window_seconds || ' seconds')::INTERVAL 
                       ELSE rate_limits.window_start 
                     END;
  
  SELECT request_count INTO v_count 
  FROM rate_limits 
  WHERE identifier = p_identifier AND endpoint = p_endpoint;

  RETURN v_count <= p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
