-- Seed: registra la dirección de email del admin en la whitelist.
-- El usuario en auth.users se crea via GoTrue Admin API en el script
-- scripts/seed-admin.sh que corre después del primer docker compose up.
-- En producción, crear el admin manualmente desde Supabase Studio.

INSERT INTO public.vendor_whitelist (email)
VALUES ('admin@tienda.com')
ON CONFLICT DO NOTHING;
