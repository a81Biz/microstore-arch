---
source_file: "supabase/kong.yml"
type: "code"
community: "Kong, Nginx & Supabase Config"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Kong_Nginx__Supabase_Config
---

# Kong API Gateway Config (kong.yml)

## Connections
- [[Kong Service auth-v1 (authv1 → supabase-auth9999)]] - `implements` [EXTRACTED]
- [[Kong Service functions-v1 (functionsv1 → supabase-functions9000)]] - `implements` [EXTRACTED]
- [[Kong Service realtime-v1 (realtimev1 → supabase-realtime4000)]] - `implements` [EXTRACTED]
- [[Kong Service rest-v1 (restv1 → supabase-rest3000)]] - `implements` [EXTRACTED]
- [[Nginx Upstream supabase-kong8000]] - `calls` [EXTRACTED]
- [[Supabase Local Config (config.toml)]] - `references` [INFERRED]

#graphify/code #graphify/EXTRACTED #community/Kong_Nginx__Supabase_Config