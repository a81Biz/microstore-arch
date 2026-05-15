---
source_file: "supabase/migrations/00001_initial_schema.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "24-28"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Enum: payment_gateway

## Connections
- [[DB Fn confirm_order_payment]] - `references` [EXTRACTED]
- [[DB Fn create_order_atomic]] - `references` [EXTRACTED]
- [[DB Fn save_payment_credentials]] - `references` [EXTRACTED]
- [[DB Table payment_credentials]] - `references` [EXTRACTED]
- [[DB Table webhook_logs]] - `references` [EXTRACTED]
- [[Migration 00001 Initial Schema]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies