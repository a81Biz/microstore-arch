# Out of Scope — PT-004

- Encrypting any columns other than profiles.totp_secret
- Supabase Vault integration (separate PT)
- Encrypting password hashes (handled by Supabase Auth internally)
- Adding TOTP to additional user roles (existing behavior preserved)
- Key rotation mechanism for ENCRYPTION_KEY
- Encrypting existing session tokens or JWTs
