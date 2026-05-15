---
source_file: "docker-compose.yml"
type: "code"
community: "Docker & Infrastructure Config"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Docker__Infrastructure_Config
---

# Service: db-seed (creates admin@tienda.com via GoTrue Admin API)

## Connections
- [[Service supabase-auth (GoTrue v2.151.0, JWT + MFA)]] - `references` [EXTRACTED]
- [[Table vendor_whitelist (email-based vendor authorization)]] - `conceptually_related_to` [INFERRED]
- [[docker-compose.yml Full Local Development Stack]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Docker__Infrastructure_Config