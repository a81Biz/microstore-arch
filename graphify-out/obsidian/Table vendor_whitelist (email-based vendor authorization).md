---
source_file: "supabase/migrations/00021_vendor_whitelist.sql"
type: "code"
community: "Docker & Infrastructure Config"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Docker__Infrastructure_Config
---

# Table: vendor_whitelist (email-based vendor authorization)

## Connections
- [[Function handle_new_user (whitelist-based role assignment)]] - `calls` [EXTRACTED]
- [[Migration 00021 Vendor Whitelist Table]] - `implements` [EXTRACTED]
- [[Migration 00026 Seed admin@tienda.com into vendor_whitelist]] - `references` [EXTRACTED]
- [[Service db-seed (creates admin@tienda.com via GoTrue Admin API)]] - `conceptually_related_to` [INFERRED]

#graphify/code #graphify/EXTRACTED #community/Docker__Infrastructure_Config