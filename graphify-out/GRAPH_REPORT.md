# Graph Report - .  (2026-05-15)

## Corpus Check
- 17 files · ~50,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1022 nodes · 1371 edges · 95 communities (70 shown, 25 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 107 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_DB Enums & MFARLS Core|DB Enums & MFA/RLS Core]]
- [[_COMMUNITY_Edge Function Patterns|Edge Function Patterns]]
- [[_COMMUNITY_Payment Encryption Migrations|Payment Encryption Migrations]]
- [[_COMMUNITY_Architecture Rules (CLAUDE.md)|Architecture Rules (CLAUDE.md)]]
- [[_COMMUNITY_SDD Flows & Infrastructure|SDD Flows & Infrastructure]]
- [[_COMMUNITY_Vendor Admin Pages|Vendor Admin Pages]]
- [[_COMMUNITY_Root DevDependencies|Root DevDependencies]]
- [[_COMMUNITY_Architecture Config & CI|Architecture Config & CI]]
- [[_COMMUNITY_Client Hub Config|Client Hub Config]]
- [[_COMMUNITY_TOTP Test Suite|TOTP Test Suite]]
- [[_COMMUNITY_Security Audit & Deploy|Security Audit & Deploy]]
- [[_COMMUNITY_Vendor Whitelist & Auth Flow|Vendor Whitelist & Auth Flow]]
- [[_COMMUNITY_Client Hub Dependencies|Client Hub Dependencies]]
- [[_COMMUNITY_Domain Interfaces|Domain Interfaces]]
- [[_COMMUNITY_Vendor Admin Dependencies|Vendor Admin Dependencies]]
- [[_COMMUNITY_Core Package Config|Core Package Config]]
- [[_COMMUNITY_Kong API Gateway|Kong API Gateway]]
- [[_COMMUNITY_TypeScript Compiler Config|TypeScript Compiler Config]]
- [[_COMMUNITY_Storefront Dependencies|Storefront Dependencies]]
- [[_COMMUNITY_Core Enums & Models|Core Enums & Models]]
- [[_COMMUNITY_Edge Function Infrastructure|Edge Function Infrastructure]]
- [[_COMMUNITY_Password & Order Management|Password & Order Management]]
- [[_COMMUNITY_Storefront Pages|Storefront Pages]]
- [[_COMMUNITY_Client Hub Checkout Flow|Client Hub Checkout Flow]]
- [[_COMMUNITY_Client Hub Auth Pages|Client Hub Auth Pages]]
- [[_COMMUNITY_Security Audit (Round 2)|Security Audit (Round 2)]]
- [[_COMMUNITY_Vendor Auth & Admin Clients|Vendor Auth & Admin Clients]]
- [[_COMMUNITY_Client Hub Auth Client|Client Hub Auth Client]]
- [[_COMMUNITY_Payment Webhook Controller|Payment Webhook Controller]]
- [[_COMMUNITY_Payment Webhook Tests|Payment Webhook Tests]]
- [[_COMMUNITY_Module Group 30|Module Group 30]]
- [[_COMMUNITY_Module Group 31|Module Group 31]]
- [[_COMMUNITY_Module Group 32|Module Group 32]]
- [[_COMMUNITY_Module Group 33|Module Group 33]]
- [[_COMMUNITY_Module Group 34|Module Group 34]]
- [[_COMMUNITY_Module Group 35|Module Group 35]]
- [[_COMMUNITY_Module Group 36|Module Group 36]]
- [[_COMMUNITY_Module Group 37|Module Group 37]]
- [[_COMMUNITY_Module Group 38|Module Group 38]]
- [[_COMMUNITY_Module Group 39|Module Group 39]]
- [[_COMMUNITY_Module Group 40|Module Group 40]]
- [[_COMMUNITY_Module Group 41|Module Group 41]]
- [[_COMMUNITY_Module Group 42|Module Group 42]]
- [[_COMMUNITY_Module Group 43|Module Group 43]]
- [[_COMMUNITY_Module Group 44|Module Group 44]]
- [[_COMMUNITY_Module Group 45|Module Group 45]]
- [[_COMMUNITY_Module Group 46|Module Group 46]]
- [[_COMMUNITY_Module Group 47|Module Group 47]]
- [[_COMMUNITY_Module Group 48|Module Group 48]]
- [[_COMMUNITY_Module Group 49|Module Group 49]]
- [[_COMMUNITY_Module Group 50|Module Group 50]]
- [[_COMMUNITY_Module Group 51|Module Group 51]]
- [[_COMMUNITY_Module Group 52|Module Group 52]]
- [[_COMMUNITY_Module Group 53|Module Group 53]]
- [[_COMMUNITY_Module Group 54|Module Group 54]]
- [[_COMMUNITY_Module Group 55|Module Group 55]]
- [[_COMMUNITY_Module Group 56|Module Group 56]]
- [[_COMMUNITY_Module Group 57|Module Group 57]]
- [[_COMMUNITY_Module Group 58|Module Group 58]]
- [[_COMMUNITY_Module Group 60|Module Group 60]]
- [[_COMMUNITY_Module Group 61|Module Group 61]]
- [[_COMMUNITY_Module Group 63|Module Group 63]]
- [[_COMMUNITY_Module Group 64|Module Group 64]]
- [[_COMMUNITY_Module Group 65|Module Group 65]]
- [[_COMMUNITY_Module Group 67|Module Group 67]]
- [[_COMMUNITY_Module Group 69|Module Group 69]]
- [[_COMMUNITY_Module Group 70|Module Group 70]]
- [[_COMMUNITY_Module Group 84|Module Group 84]]
- [[_COMMUNITY_Module Group 85|Module Group 85]]
- [[_COMMUNITY_Module Group 86|Module Group 86]]
- [[_COMMUNITY_Module Group 87|Module Group 87]]
- [[_COMMUNITY_Module Group 88|Module Group 88]]
- [[_COMMUNITY_Module Group 89|Module Group 89]]
- [[_COMMUNITY_Module Group 90|Module Group 90]]
- [[_COMMUNITY_Module Group 91|Module Group 91]]
- [[_COMMUNITY_Module Group 92|Module Group 92]]
- [[_COMMUNITY_Module Group 93|Module Group 93]]
- [[_COMMUNITY_Module Group 94|Module Group 94]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `createLogger()` - 16 edges
3. `Deploy All Script` - 15 edges
4. `Edge Runtime Main Worker (Router)` - 14 edges
5. `docker-compose.yml: Full Local Development Stack` - 14 edges
6. `dependencies` - 13 edges
7. `dependencies` - 13 edges
8. `../../lib/auth/auth-client.ts` - 13 edges
9. `DB Table: profiles` - 13 edges
10. `DB Table: orders` - 13 edges

## Surprising Connections (you probably didn't know these)
- `getCurrentUser` --conceptually_related_to--> `Row Level Security (RLS) Policy Pattern`  [INFERRED]
  apps/client-hub/src/lib/auth/auth-client.ts → docs/Fix & Hardening Runbook.md
- `Migration 00018: Fix Payment Encryption (pgsodium → pgcrypto)` --rationale_for--> `Fix 3: Secure nonce via pgsodium.crypto_secretbox_noncegen()`  [INFERRED]
  supabase/migrations/00018_fix_payment_encryption.sql → docs/Correcciones Finales.md
- `Pattern: pgp_sym_encrypt AES-256 with IV embedded` --rationale_for--> `Architecture Decision: Multi-layer security (RLS + MFA + AES-256)`  [INFERRED]
  supabase/migrations/00018_fix_payment_encryption.sql → docs/ARCHITECTURE.md
- `Pattern: mfa_verified in app_metadata JWT claim` --rationale_for--> `Architecture Decision: Multi-layer security (RLS + MFA + AES-256)`  [INFERRED]
  supabase/migrations/00020_audit_payment_tables.sql → docs/ARCHITECTURE.md
- `Table: vendor_whitelist (email-based vendor authorization)` --conceptually_related_to--> `Service: db-seed (creates admin@tienda.com via GoTrue Admin API)`  [INFERRED]
  supabase/migrations/00021_vendor_whitelist.sql → docker-compose.yml

## Hyperedges (group relationships)
- **Payment Credentials Encryption Pipeline** — manage_payment_gateways_fn, fn_save_gateway_credentials_secure, fn_save_payment_credentials, payment_credentials_table [EXTRACTED 0.95]
- **Vendor Admin MFA + RLS Security Gate** — concept_mfa_rls_claim, migration_00015_storage_hardening, fn_auth_jwt, manage_payment_gateways_fn [INFERRED 0.85]
- **Cascading State Protocol Document Hierarchy** — session_summary_md, plan_actual_md, pending_tasks_md, concept_cascading_state_protocol [EXTRACTED 0.95]

## Communities (95 total, 25 thin omitted)

### Community 0 - "DB Enums & MFA/RLS Core"
Cohesion: 0.07
Nodes (52): mfa_verified JWT Claim as RLS Gate, DB Enum: item_fulfillment_status, DB Enum: order_status, DB Enum: payment_gateway, DB Enum: user_role, DB Fn: check_password_change_required, DB Fn: confirm_order_payment, DB Fn: create_order_atomic (+44 more)

### Community 1 - "Edge Function Patterns"
Cohesion: 0.09
Nodes (47): Atomic Order Creation with Pessimistic Locking, Centralized CORS Management, HMAC-SHA256 Webhook Signature Verification, Vendor MFA Authentication Flow, Password Complexity Policy, Payment Amount Mismatch Detection (Anti-Fraud), Rate Limiting Pattern, Webhook Idempotency Pattern (+39 more)

### Community 2 - "Payment Encryption Migrations"
Cohesion: 0.07
Nodes (39): Migration 00018: Fix Payment Encryption (pgsodium → pgcrypto), Extension: pgcrypto (AES-256 symmetric encryption), Function: save_payment_credentials (pgcrypto AES-256 v1), Migration 00019: Fix Order Cancellation Stock Restoration, Function: update_order_status_manual (with stock restoration), Table: audit_logs (immutable audit trail), Migration 00020: Audit Logs & Payment Transactions, Function: confirm_order_payment (updated with transaction logging) (+31 more)

### Community 3 - "Architecture Rules (CLAUDE.md)"
Cohesion: 0.08
Nodes (38): App: client-hub (Astro 5 + React 18 + Alpine.js), App: storefront (Astro 5 + Alpine.js), App: vendor-admin (Astro 5 + React 18 + Alpine.js), Astro + Islands Pattern, scripts/check-architecture.sh — Architecture CI Guard, CLAUDE.md — Project Guidance File, Graphify Knowledge Graph Context Protocol, @micro-store/core Package (+30 more)

### Community 4 - "SDD Flows & Infrastructure"
Cohesion: 0.06
Nodes (37): SDD: Purchase Flow Diagram, SDD: Storefront SSG Rebuild Flow, SDD: Payment Webhook Confirmation Flow, SDD: Free Tier Infrastructure Strategy, SDD: Vendor Admin UI Design, Sprint 3: Checkout y Pagos, DB Function: confirm_order_payment, DB Function: create_order_atomic (+29 more)

### Community 5 - "Vendor Admin Pages"
Cohesion: 0.1
Nodes (26): ../../layouts/VendorAdminLayout.astro, ../../lib/products/product-admin.ts, ../../layouts/VendorAdminLayout.astro, ../../lib/auth/auth-client, ../../lib/orders/order-admin, ../../lib/products/product-admin.ts, ../../lib/supabase-client, @micro-store/core (+18 more)

### Community 6 - "Root DevDependencies"
Cohesion: 0.06
Nodes (31): devDependencies, husky, lint-staged, prettier, ts-node, typescript, engines, node (+23 more)

### Community 7 - "Architecture Config & CI"
Cohesion: 0.09
Nodes (27): auth-client.ts Library, Script: check-architecture.sh (CI architecture validator), CLAUDE.md Project Instructions, Architecture Rules: 5 CI-enforced constraints, NPM Workspaces Monorepo Pattern, auth.jwt() Self-Hosted Polyfill, Cascading State Protocol (ACK-gated workflow), pgcrypto extensions.* Schema Qualification Fix (+19 more)

### Community 8 - "Client Hub Config"
Cohesion: 0.11
Nodes (29): client-hub Astro Config, client-hub package.json, Astro Islands Pattern, NPM Workspaces Monorepo, @micro-store/eslint-config Package, API Routes Constants, Core Package Entry Point, @micro-store/core Package (+21 more)

### Community 9 - "TOTP Test Suite"
Cohesion: 0.07
Nodes (23): bytes, bytes1, bytes2, code1, code2, currentCode, currentValid, delta (+15 more)

### Community 10 - "Security Audit & Deploy"
Cohesion: 0.13
Nodes (28): CRÍTICO-4: Plaintext Credential Fallback, CRÍTICO-1: TOTP Hardcoded Secret, CRÍTICO-3: Webhooks Sin Verificación de Firma, Cloudflare Pages Deploy Hook, Auditoría Técnica Profunda, Fix & Hardening Runbook, Sprint 0 — Configuración y Setup, SRS — Especificación de Requisitos (+20 more)

### Community 11 - "Vendor Whitelist & Auth Flow"
Cohesion: 0.11
Nodes (24): RLS Policy: vendor_whitelist service_role only (USING false), Migration 00021: Vendor Whitelist Table, Table: vendor_whitelist (email-based vendor authorization), Migration 00026: Seed admin@tienda.com into vendor_whitelist, Vendor MFA First-Login Flow, Service: client-hub (Astro + React + Alpine.js, port 5173), docker-compose.yml: Full Local Development Stack, Service: db-migrate (applies all .sql migrations in order, runs once) (+16 more)

### Community 12 - "Client Hub Dependencies"
Cohesion: 0.08
Nodes (24): dependencies, alpinejs, astro, @astrojs/alpinejs, @astrojs/check, @astrojs/react, @micro-store/core, react (+16 more)

### Community 13 - "Domain Interfaces"
Cohesion: 0.13
Nodes (24): AdminProduct Interface, AuthLayout (Vendor Admin), AuthResult Interface, BaseLayout (Storefront), Catalog Data Layer, CatalogProduct Interface, changePassword Function, confirmTOTP Function (+16 more)

### Community 14 - "Vendor Admin Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, alpinejs, astro, @astrojs/alpinejs, @astrojs/check, @astrojs/react, @micro-store/core, react (+15 more)

### Community 15 - "Core Package Config"
Cohesion: 0.09
Nodes (21): dependencies, zod, description, devDependencies, otpauth, typescript, vitest, exports (+13 more)

### Community 16 - "Kong API Gateway"
Cohesion: 0.1
Nodes (21): Kong Service: auth-v1 (/auth/v1 → supabase-auth:9999), Kong Service: functions-v1 (/functions/v1 → supabase-functions:9000), Kong Service: realtime-v1 (/realtime/v1 → supabase-realtime:4000), Kong Service: rest-v1 (/rest/v1 → supabase-rest:3000), Kong API Gateway Config (kong.yml), Nginx Upstream: client-hub:5173, Nginx: nginx.conf (main config with WebSocket map), Nginx: microstore.conf (subdomain routing) (+13 more)

### Community 17 - "TypeScript Compiler Config"
Cohesion: 0.1
Nodes (19): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, module, moduleResolution (+11 more)

### Community 18 - "Storefront Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, alpinejs, astro, @astrojs/alpinejs, @astrojs/check, @micro-store/core, @supabase/supabase-js, typescript (+10 more)

### Community 19 - "Core Enums & Models"
Cohesion: 0.15
Nodes (12): ItemFulfillmentStatus, OrderStatus, PaymentGateway, Order, OrderItem, CreateOrderPayload, CreateOrderPayloadSchema, OrderTracking (+4 more)

### Community 20 - "Edge Function Infrastructure"
Cohesion: 0.14
Nodes (13): checks, logger, supabase, supabaseAdmin, logger, resendKey, supabaseAdmin, logger (+5 more)

### Community 21 - "Password & Order Management"
Cohesion: 0.15
Nodes (11): logger, supabaseAdmin, logger, OrderFilters, TrackingUpdate, AppError, BusinessError, handleError() (+3 more)

### Community 22 - "Storefront Pages"
Cohesion: 0.2
Nodes (14): ../components/product/ProductCard.astro, ../../layouts/BaseLayout.astro, ../../lib/catalog/catalog.ts, ../styles/global.css, CatalogProduct, getAllProductSlugs(), getProductBySlug(), getVisibleProducts() (+6 more)

### Community 23 - "Client Hub Checkout Flow"
Cohesion: 0.17
Nodes (17): Checkout Client, Checkout Flow E2E Test, ClientHubLayout Astro, Order Client, Order Client Tests, Auth Callback Page, Checkout Page, client-hub Index Page (+9 more)

### Community 24 - "Client Hub Auth Pages"
Cohesion: 0.15
Nodes (8): ../../layouts/ClientHubLayout.astro, ../lib/auth/auth-client, ../../lib/checkout/checkout-client, ../../lib/orders/order-client, ../lib/supabase-client, fetchOrders(), init(), loadCustomerOrders()

### Community 25 - "Security Audit (Round 2)"
Cohesion: 0.18
Nodes (15): CLABE Hardcodeada Hey Banco (C3), CORS Wildcard en todos los endpoints (C6), Doble Autenticación por Request, Email Hardcodeado para Vendor Role (C7), localStorage auth_token en Checkout (C4), localStorage auth_token en Settings (C5), Rate Limiting Fail-Open (C10), Policies RLS Contradictorias (AMR vs app_metadata) (+7 more)

### Community 26 - "Vendor Auth & Admin Clients"
Cohesion: 0.22
Nodes (14): AdminOrder Interface, Auth Client (Vendor Admin), getVendorAuthHeader Function, Order Admin Client, Product Admin Client, signOut Function, Supabase Client (Vendor Admin), triggerRebuild Function (+6 more)

### Community 27 - "Client Hub Auth Client"
Cohesion: 0.18
Nodes (7): ../../lib/auth/auth-client.ts, AuthResult, getCurrentUser(), signOut(), signUpWithEmail(), handleRegister(), loadProfile()

### Community 28 - "Payment Webhook Controller"
Cohesion: 0.31
Nodes (5): logger, PaymentWebhookController, verifyHeyBancoSignature(), verifyMercadoPagoSignature(), verifyStripeSignature()

### Community 29 - "Payment Webhook Tests"
Cohesion: 0.15
Nodes (9): existingLog, expectedCents, header, parts, tamperedBody, timestamp, tPart, v1Part (+1 more)

### Community 30 - "Module Group 30"
Cohesion: 0.2
Nodes (8): ../../lib/supabase-client.ts, CheckoutResult, createOrder(), getAuthHeader(), HeyBancoInstructions, PaymentResult, ShippingAddress, supabaseClient

### Community 31 - "Module Group 31"
Cohesion: 0.18
Nodes (5): authenticateUser(), requireAdminMFA(), CreateProductSchema, logger, UpdateProductSchema

### Community 32 - "Module Group 32"
Cohesion: 0.21
Nodes (7): logger, getLogflareClient(), LogflareClient, LogflareConfig, createLogger(), LogEntry, LogLevel

### Community 33 - "Module Group 33"
Cohesion: 0.2
Nodes (11): Inconsistencia MFA user_metadata vs app_metadata (C2), Backdoor TOTP en verify-totp (C1), DoD Sprint 0 Infraestructura y Entorno, DoD Sprint 1 Autenticación y Perfiles, Reescritura verify-totp con TOTP Real, Metodología Docker-First, Migración 00001 Initial Schema, Estructura Monorepo npm Workspaces (+3 more)

### Community 34 - "Module Group 34"
Cohesion: 0.31
Nodes (8): ../../layouts/AuthLayout.astro, ../../lib/auth/auth-client.ts, base(), changePassword(), confirmTOTP(), setupTOTP(), vendorSignIn(), verifyTOTP()

### Community 35 - "Module Group 35"
Cohesion: 0.24
Nodes (8): generateTimeline(), loadOrderDetail(), mapToViewModel(), OrderItemViewModel, OrderViewModel, RawOrder, RawOrderItem, TimelineStep

### Community 36 - "Module Group 36"
Cohesion: 0.2
Nodes (9): devDependencies, eslint, eslint-config-prettier, eslint-plugin-astro, eslint-plugin-react, main, name, private (+1 more)

### Community 37 - "Module Group 37"
Cohesion: 0.22
Nodes (10): SDD: Role-Based Access Matrix, SDD: System Architecture Overview, SDD: Entity-Relationship Data Model, SDD: Database ENUM Types Definition, SDD: Vendor MFA Auth Flow Diagram, SDD: Monorepo Component Diagram, SDD: Jamstack + Hexagonal Architecture Patterns, SDD: 5-Layer Security Design (+2 more)

### Community 38 - "Module Group 38"
Cohesion: 0.22
Nodes (9): Validación de Monto en Webhooks, Tablas audit_logs y payment_transactions, Corrección IDOR Gateways de Pago, Validación de Complejidad de Contraseña, Rate Limiting en Login, Remediation Report Primera Ronda, Restauración de Stock en Cancelaciones, Secret TOTP Único por Usuario (+1 more)

### Community 39 - "Module Group 39"
Cohesion: 0.36
Nodes (8): AuthResult Interface, getCurrentUser, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, supabaseClient (client-hub), Auth Client Test Suite

### Community 40 - "Module Group 40"
Cohesion: 0.29
Nodes (8): AppError Class, BusinessError Class, UnauthorizedError Class, handleError Function, LogflareClient Class, LogflareConfig Interface, getLogflareClient Singleton Factory, createLogger Function

### Community 41 - "Module Group 41"
Cohesion: 0.29
Nodes (8): Nonce Seguro pgsodium.crypto_secretbox_noncegen, pgcrypto para Credenciales de Pago, Client Hub: checkout-client.ts Library, Client Hub: Checkout Page (multi-step), Edge Function: manage-payment-gateways, Encriptación pgsodium en Base de Datos, DB Function: save_payment_credentials (pgsodium), Vendor Admin: Gateway Settings Page

### Community 42 - "Module Group 42"
Cohesion: 0.48
Nodes (7): Networking Docker host.docker.internal, DoD Correcciones Finales, DoD Fix and Hardening, MFA Robusto en RLS Compatibilidad Free Tier, Rate Limiting SQL Puro, Storage RLS Bucket product-images, Idempotencia de Webhooks webhook_logs

### Community 44 - "Module Group 44"
Cohesion: 0.29
Nodes (5): headers, logger, response, supabaseAdmin, supabaseClient

### Community 46 - "Module Group 46"
Cohesion: 0.29
Nodes (5): delta, logger, supabaseAdmin, totp, UnauthorizedError

### Community 47 - "Module Group 47"
Cohesion: 0.29
Nodes (6): logger, otpauthUrl, secret, secretBytes, supabaseAdmin, totp

### Community 48 - "Module Group 48"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 50 - "Module Group 50"
Cohesion: 0.33
Nodes (6): DoD Sprint 4 Pedidos y Logística, DoD Sprint 5 Despliegue y Cierre, Notificaciones Realtime de Pedidos, Máquina de Estados de Órdenes en PL/pgSQL, Despliegue en Cloudflare Pages, Integración Logflare para Observabilidad

### Community 51 - "Module Group 51"
Cohesion: 0.33
Nodes (6): DoD Sprint 2 Catálogo y Productos, DoD Sprint 3 Checkout y Pagos, Generación Automática de Slugs en BD, Catálogo SSG con Astro, Creación Atómica de Órdenes con FOR UPDATE, Múltiples Pasarelas de Pago

### Community 52 - "Module Group 52"
Cohesion: 0.33
Nodes (5): delta, logger, secret, supabaseAdmin, totp

### Community 53 - "Module Group 53"
Cohesion: 0.33
Nodes (5): mockGetUser, mockSignInWithOAuth, mockSignInWithPassword, mockSignOut, mockSignUp

### Community 56 - "Module Group 56"
Cohesion: 0.4
Nodes (4): CreateOrderPayloadSchema, logger, OrderRpcResult, ShippingAddressSchema

### Community 60 - "Module Group 60"
Cohesion: 1.0
Nodes (3): DB Fn: check_rate_limit, DB Table: rate_limits, Migration 00016: Rate Limiting

## Knowledge Gaps
- **401 isolated node(s):** `name`, `version`, `private`, `dev`, `dev:stop` (+396 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Migration 00015: Storage Hardening` connect `DB Enums & MFA/RLS Core` to `Architecture Config & CI`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `Encriptación pgsodium en Base de Datos` connect `Module Group 41` to `Module Group 51`, `Module Group 37`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `Table: vendor_whitelist (email-based vendor authorization)` connect `Vendor Whitelist & Auth Flow` to `Payment Encryption Migrations`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _401 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `DB Enums & MFA/RLS Core` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Edge Function Patterns` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Payment Encryption Migrations` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._