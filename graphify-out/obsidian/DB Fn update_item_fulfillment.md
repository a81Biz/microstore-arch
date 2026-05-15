---
source_file: "supabase/migrations/00011_update_item_fulfillment.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "2-34"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Fn: update_item_fulfillment

## Connections
- [[DB Enum item_fulfillment_status]] - `references` [EXTRACTED]
- [[DB Fn update_order_status]] - `semantically_similar_to` [INFERRED]
- [[DB Table order_items]] - `references` [EXTRACTED]
- [[DB Table orders]] - `references` [EXTRACTED]
- [[Migration 00011 update_item_fulfillment Function]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies