---
source_file: "supabase/migrations/00009_update_order_tracking.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "2-56"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Fn: update_order_tracking

## Connections
- [[DB Fn update_order_status_manual]] - `semantically_similar_to` [INFERRED]
- [[DB Table order_items]] - `references` [EXTRACTED]
- [[DB Table orders]] - `references` [EXTRACTED]
- [[Migration 00009 update_order_tracking Function]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies