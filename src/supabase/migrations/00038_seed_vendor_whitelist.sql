-- PT-005: Pre-deploy seed — copy all existing vendor emails into vendor_whitelist
-- so that vendors are not locked out when the whitelist check is activated in login.
-- vendor_whitelist schema (00021): email TEXT PRIMARY KEY, created_at TIMESTAMPTZ
INSERT INTO vendor_whitelist (email)
SELECT u.email
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE p.role = 'vendor'
ON CONFLICT DO NOTHING;
