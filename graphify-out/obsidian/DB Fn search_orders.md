---
source_file: "supabase/migrations/00012_search_orders.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "2-48"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Fn: search_orders

## Connections
- [[DB Enum order_status]] - `references` [EXTRACTED]
- [[DB Table order_items]] - `references` [EXTRACTED]
- [[DB Table orders]] - `references` [EXTRACTED]
- [[DB Table profiles]] - `references` [EXTRACTED]
- [[Migration 00012 search_orders Function]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies