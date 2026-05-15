---
source_file: "supabase/migrations/00020_audit_payment_tables.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# Function: confirm_order_payment (updated with transaction logging)

## Connections
- [[Migration 00020 Audit Logs & Payment Transactions]] - `implements` [EXTRACTED]
- [[Table order_items]] - `calls` [EXTRACTED]
- [[Table orders]] - `calls` [EXTRACTED]
- [[Table payment_transactions (payment lifecycle)]] - `calls` [EXTRACTED]
- [[Table products]] - `calls` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations