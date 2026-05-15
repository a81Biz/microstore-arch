---
source_file: "supabase/migrations/00023_cleanup_amr_policy.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# Migration 00023: Cleanup AMR Policy (drop admin_with_mfa profile policy)

## Connections
- [[Extension pgcrypto (AES-256 symmetric encryption)]] - `references` [EXTRACTED]
- [[Fix 1 RLS MFA via app_metadata instead of AMR claim]] - `implements` [INFERRED]
- [[Table profiles (user roles + TOTP state)]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations