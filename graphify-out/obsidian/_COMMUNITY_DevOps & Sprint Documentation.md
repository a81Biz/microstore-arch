---
type: community
cohesion: 0.05
members: 49
---

# DevOps & Sprint Documentation

**Cohesion:** 0.05 - loosely connected
**Members:** 49 nodes

## Members
- [[Architecture Documentation (docsARCHITECTURE.md)]] - document - docs/Sprint 5.md
- [[Backup Production Script]] - code - scripts/deploy/backup-production.sh
- [[Client Hub Checkout Page (multi-step)]] - code - docs/Sprint 3.md
- [[Client Hub checkout-client.ts Library]] - code - docs/Sprint 3.md
- [[Cloudflare Pages Multi-Site Deployment]] - code - docs/Sprint 5.md
- [[DB Function confirm_order_payment]] - code - docs/Sprint 3.md
- [[DB Function create_order_atomic]] - code - docs/Sprint 3.md
- [[DB Function get_active_payment_methods]] - code - docs/Sprint 3.md
- [[DB Function save_payment_credentials (pgsodium)]] - code - docs/Sprint 3.md
- [[DB Function search_orders (admin)]] - code - docs/Sprint 4.md
- [[DB Function update_item_fulfillment]] - code - docs/Sprint 4.md
- [[DB Function update_order_status_manual]] - code - docs/Sprint 4.md
- [[DB Function update_order_tracking]] - code - docs/Sprint 4.md
- [[Database Backup with 30-Day Retention]] - rationale - scripts/deploy/backup-production.sh
- [[Edge Function create-order]] - code - docs/Sprint 3.md
- [[Edge Function health (enhanced)]] - code - docs/Sprint 5.md
- [[Edge Function manage-orders]] - code - docs/Sprint 4.md
- [[Edge Function manage-payment-gateways]] - code - docs/Sprint 3.md
- [[Edge Function payment-webhook (idempotent)]] - code - docs/Sprint 3.md
- [[Edge Function send-order-email]] - code - docs/Sprint 3.md
- [[Edge Function send-shipping-email]] - code - docs/Sprint 4.md
- [[GitHub Actions Data Cleanup and Archiving]] - code - docs/Sprint 5.md
- [[GitHub Actions Deploy to Production Workflow]] - code - docs/Sprint 5.md
- [[GitHub Actions Scheduled Backup Workflow]] - code - docs/Sprint 5.md
- [[Hey Banco Payment Gateway Integration]] - code - docs/Sprint 3.md
- [[Load Test Script]] - code - docs/Sprint 5.md
- [[Logflare Monitoring Integration]] - code - docs/Sprint 5.md
- [[Mercado Pago Payment Gateway Integration]] - code - docs/Sprint 3.md
- [[Operational Runbook (docsRUNBOOK.md)]] - document - docs/Sprint 5.md
- [[PayPal Payment Gateway Integration]] - code - docs/Sprint 3.md
- [[Production Database Backup Script]] - code - docs/Sprint 5.md
- [[Project Handoff Document (docsHANDOFF.md)]] - document - docs/Sprint 5.md
- [[RUNBOOK.md Production Operations Runbook]] - document - docs/RUNBOOK.md
- [[Resend Transactional Email Service]] - rationale - docs/Sprint 3.md
- [[SDD Free Tier Infrastructure Strategy]] - rationale - docs/Documento de Diseño de Software (SDD).md
- [[SDD Payment Webhook Confirmation Flow]] - document - docs/Documento de Diseño de Software (SDD).md
- [[SDD Purchase Flow Diagram]] - document - docs/Documento de Diseño de Software (SDD).md
- [[SDD Storefront SSG Rebuild Flow]] - document - docs/Documento de Diseño de Software (SDD).md
- [[SDD Vendor Admin UI Design]] - document - docs/Documento de Diseño de Software (SDD).md
- [[Smoke Test Script]] - code - docs/Sprint 5.md
- [[Sprint 3 Checkout y Pagos]] - document - docs/Sprint 3.md
- [[Sprint 4 Pedidos y Logística]] - document - docs/Sprint 4.md
- [[Sprint 5 Despliegue, Monitoreo y Cierre]] - document - docs/Sprint 5.md
- [[Stripe Payment Gateway Integration]] - code - docs/Sprint 3.md
- [[Vendor Admin Gateway Settings Page]] - code - docs/Sprint 3.md
- [[Vendor Admin Orders Panel Page]] - code - docs/Sprint 4.md
- [[Vendor Admin order-admin.ts Library]] - code - docs/Sprint 4.md
- [[backup-production.sh]] - code - scripts/deploy/backup-production.sh
- [[pgsodium Credential Encryption]] - rationale - docs/Sprint 3.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/DevOps__Sprint_Documentation
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Kong, Nginx & Supabase Config]]
- 1 edge to [[_COMMUNITY_Module 24 - scripts_security_check_secur]]

## Top bridge nodes
- [[Edge Function create-order]] - degree 8, connects to 1 community
- [[pgsodium Credential Encryption]] - degree 2, connects to 1 community