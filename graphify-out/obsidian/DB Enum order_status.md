---
source_file: "supabase/migrations/00001_initial_schema.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "12-16"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Enum: order_status

## Connections
- [[DB Fn create_order_atomic]] - `references` [EXTRACTED]
- [[DB Fn search_orders]] - `references` [EXTRACTED]
- [[DB Fn update_order_status_manual]] - `references` [EXTRACTED]
- [[DB Table orders]] - `references` [EXTRACTED]
- [[Migration 00001 Initial Schema]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies