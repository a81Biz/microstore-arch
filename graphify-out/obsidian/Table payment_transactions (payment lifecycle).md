---
source_file: "supabase/migrations/00020_audit_payment_tables.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# Table: payment_transactions (payment lifecycle)

## Connections
- [[Function confirm_order_payment (updated with transaction logging)]] - `calls` [EXTRACTED]
- [[Migration 00020 Audit Logs & Payment Transactions]] - `implements` [EXTRACTED]
- [[RLS Policy payment_transactions customer read (via orders)]] - `references` [EXTRACTED]
- [[RLS Policy payment_transactions vendor MFA read]] - `references` [EXTRACTED]
- [[Table orders]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations