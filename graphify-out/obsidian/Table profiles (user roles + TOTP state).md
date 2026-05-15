---
source_file: "supabase/migrations/00020_audit_payment_tables.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# Table: profiles (user roles + TOTP state)

## Connections
- [[Function handle_new_user (whitelist-based role assignment)]] - `calls` [EXTRACTED]
- [[Migration 00023 Cleanup AMR Policy (drop admin_with_mfa profile policy)]] - `references` [EXTRACTED]
- [[Table audit_logs (immutable audit trail)]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations