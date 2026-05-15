---
type: community
cohesion: 0.13
members: 19
---

# Shared Logger & Monitoring (Logflare)

**Cohesion:** 0.13 - loosely connected
**Members:** 19 nodes

## Members
- [[.constructor()_3]] - code - supabase/functions/_shared/monitoring/logflare.ts
- [[.sendLog()]] - code - supabase/functions/_shared/monitoring/logflare.ts
- [[LogEntry]] - code - supabase/functions/_shared/logger.ts
- [[LogEntry Interface]] - code - supabase/functions/_shared/logger.ts
- [[LogLevel]] - code - supabase/functions/_shared/logger.ts
- [[LogflareClient]] - code - supabase/functions/_shared/monitoring/logflare.ts
- [[LogflareConfig]] - code - supabase/functions/_shared/monitoring/logflare.ts
- [[cfApiToken]] - code - supabase/functions/trigger-rebuild/index.ts
- [[cfDeployHookUrl]] - code - supabase/functions/trigger-rebuild/index.ts
- [[createLogger()]] - code - supabase/functions/_shared/logger.ts
- [[getLogflareClient()]] - code - supabase/functions/_shared/monitoring/logflare.ts
- [[index.ts_15]] - code - supabase/functions/send-order-email/index.ts
- [[index.ts_18]] - code - supabase/functions/trigger-rebuild/index.ts
- [[logflare.ts]] - code - supabase/functions/_shared/monitoring/logflare.ts
- [[logger_8]] - code - supabase/functions/send-order-email/index.ts
- [[logger_11]] - code - supabase/functions/trigger-rebuild/index.ts
- [[logger.ts]] - code - supabase/functions/_shared/logger.ts
- [[resendKey]] - code - supabase/functions/send-order-email/index.ts
- [[supabaseAdmin_3]] - code - supabase/functions/send-order-email/index.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Shared_Logger__Monitoring_Logflare
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_Module 21 - change_password_index_logger]]
- 4 edges to [[_COMMUNITY_Module 27 - manage_payment_gateways_inde]]
- 2 edges to [[_COMMUNITY_Module 37 - create_order_index_createord]]
- 2 edges to [[_COMMUNITY_Module 38 - login_index_checkloginrateli]]
- 2 edges to [[_COMMUNITY_Module 41 - manage_orders_index_logger]]
- 2 edges to [[_COMMUNITY_Module 22 - payment_webhook_index_logger]]
- 2 edges to [[_COMMUNITY_Module 33 - send_shipping_email_index_ge]]
- 2 edges to [[_COMMUNITY_Module 30 - setup_totp_index_logger]]
- 2 edges to [[_COMMUNITY_Module 34 - supabase_functions_verify_to]]

## Top bridge nodes
- [[logger.ts]] - degree 18, connects to 9 communities
- [[createLogger()]] - degree 16, connects to 9 communities