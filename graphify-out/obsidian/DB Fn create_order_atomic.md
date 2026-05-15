---
source_file: "supabase/migrations/00005_create_order_atomic.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "2-74"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Fn: create_order_atomic

## Connections
- [[DB Enum order_status]] - `references` [EXTRACTED]
- [[DB Enum payment_gateway]] - `references` [EXTRACTED]
- [[DB Fn confirm_order_payment]] - `semantically_similar_to` [INFERRED]
- [[DB Fn generate_order_display_id]] - `calls` [EXTRACTED]
- [[DB Table order_items]] - `references` [EXTRACTED]
- [[DB Table orders]] - `references` [EXTRACTED]
- [[DB Table products]] - `references` [EXTRACTED]
- [[Migration 00005 create_order_atomic Function]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies