---
source_file: "supabase/migrations/00006_confirm_order_payment.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "2-54"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Fn: confirm_order_payment

## Connections
- [[DB Enum payment_gateway]] - `references` [EXTRACTED]
- [[DB Fn create_order_atomic]] - `semantically_similar_to` [INFERRED]
- [[DB Fn update_order_status]] - `calls` [EXTRACTED]
- [[DB Table order_items]] - `references` [EXTRACTED]
- [[DB Table orders]] - `references` [EXTRACTED]
- [[DB Table products]] - `references` [EXTRACTED]
- [[Migration 00006 confirm_order_payment Function]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies