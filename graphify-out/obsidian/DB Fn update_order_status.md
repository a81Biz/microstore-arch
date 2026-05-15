---
source_file: "supabase/migrations/00001_initial_schema.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "115-143"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Fn: update_order_status

## Connections
- [[DB Fn confirm_order_payment]] - `calls` [EXTRACTED]
- [[DB Fn update_item_fulfillment]] - `semantically_similar_to` [INFERRED]
- [[DB Table order_items]] - `references` [EXTRACTED]
- [[DB Table orders]] - `references` [EXTRACTED]
- [[Migration 00001 Initial Schema]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies