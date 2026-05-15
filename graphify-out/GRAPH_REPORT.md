# Graph Report - .  (2026-05-15)

## Corpus Check
- 148 files · ~89,686 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 935 nodes · 1258 edges · 88 communities (67 shown, 21 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 94 edges (avg confidence: 0.84)
- Token cost: 12,500 input · 4,800 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Database Schema & Core Tables|Database Schema & Core Tables]]
- [[_COMMUNITY_Payment Credentials & Transactions|Payment Credentials & Transactions]]
- [[_COMMUNITY_Backend Deployment & Routing|Backend Deployment & Routing]]
- [[_COMMUNITY_Order & Payment Edge Functions|Order & Payment Edge Functions]]
- [[_COMMUNITY_Vendor Admin Client Library|Vendor Admin Client Library]]
- [[_COMMUNITY_Root Package Scripts|Root Package Scripts]]
- [[_COMMUNITY_Core Domain Types & Enums|Core Domain Types & Enums]]
- [[_COMMUNITY_Requirements & Technical Docs|Requirements & Technical Docs]]
- [[_COMMUNITY_App Dependencies Config|App Dependencies Config]]
- [[_COMMUNITY_Vendor Auth & TOTP Flow|Vendor Auth & TOTP Flow]]
- [[_COMMUNITY_TOTP Test Suite|TOTP Test Suite]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Core Package Config|Core Package Config]]
- [[_COMMUNITY_Infrastructure & API Gateway|Infrastructure & API Gateway]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Package Dependencies B|Package Dependencies B]]
- [[_COMMUNITY_Error Handling Utilities|Error Handling Utilities]]
- [[_COMMUNITY_Order Domain Model|Order Domain Model]]
- [[_COMMUNITY_Supabase Client Instances|Supabase Client Instances]]
- [[_COMMUNITY_Storefront Catalog Pages|Storefront Catalog Pages]]
- [[_COMMUNITY_Client Hub App Layer|Client Hub App Layer]]
- [[_COMMUNITY_Client Hub Auth Pages|Client Hub Auth Pages]]
- [[_COMMUNITY_Docker Dev Stack|Docker Dev Stack]]
- [[_COMMUNITY_Security Audit Round 2|Security Audit Round 2]]
- [[_COMMUNITY_Vendor Admin App UI|Vendor Admin App UI]]
- [[_COMMUNITY_Logging Infrastructure|Logging Infrastructure]]
- [[_COMMUNITY_Client Hub Auth Flow|Client Hub Auth Flow]]
- [[_COMMUNITY_Webhook Test Suite|Webhook Test Suite]]
- [[_COMMUNITY_Checkout Client|Checkout Client]]
- [[_COMMUNITY_Base Controller & Auth|Base Controller & Auth]]
- [[_COMMUNITY_Payment Webhook Controller|Payment Webhook Controller]]
- [[_COMMUNITY_Sprint DoDs & Security Fixes|Sprint DoDs & Security Fixes]]
- [[_COMMUNITY_Error Types & Validation|Error Types & Validation]]
- [[_COMMUNITY_Vendor Auth Client|Vendor Auth Client]]
- [[_COMMUNITY_Order Detail Client|Order Detail Client]]
- [[_COMMUNITY_Misc Package Config|Misc Package Config]]
- [[_COMMUNITY_Software Design Document|Software Design Document]]
- [[_COMMUNITY_First Remediation Report|First Remediation Report]]
- [[_COMMUNITY_Auth Client Tests|Auth Client Tests]]
- [[_COMMUNITY_Logging & Error Classes|Logging & Error Classes]]
- [[_COMMUNITY_Payment Encryption|Payment Encryption]]
- [[_COMMUNITY_Create Order Controller|Create Order Controller]]
- [[_COMMUNITY_Order Management Controller|Order Management Controller]]
- [[_COMMUNITY_DoD Final Corrections|DoD Final Corrections]]
- [[_COMMUNITY_Setup TOTP Function|Setup TOTP Function]]
- [[_COMMUNITY_Product Controller|Product Controller]]
- [[_COMMUNITY_Core TypeScript Config|Core TypeScript Config]]
- [[_COMMUNITY_Sprint 4-5 DoDs|Sprint 4-5 DoDs]]
- [[_COMMUNITY_Sprint 2-3 DoDs|Sprint 2-3 DoDs]]
- [[_COMMUNITY_Verify TOTP Function|Verify TOTP Function]]
- [[_COMMUNITY_Auth Client Test Mocks|Auth Client Test Mocks]]
- [[_COMMUNITY_Payment Gateway Controller|Payment Gateway Controller]]
- [[_COMMUNITY_Stock Utilities|Stock Utilities]]
- [[_COMMUNITY_Order Shared Schemas|Order Shared Schemas]]
- [[_COMMUNITY_Order Client Tests|Order Client Tests]]
- [[_COMMUNITY_CI Architecture Rules|CI Architecture Rules]]
- [[_COMMUNITY_User Profile Types|User Profile Types]]
- [[_COMMUNITY_Rate Limiting Database|Rate Limiting Database]]
- [[_COMMUNITY_Health Check Function|Health Check Function]]
- [[_COMMUNITY_Security Scripts & RLS|Security Scripts & RLS]]
- [[_COMMUNITY_API Routes Constants|API Routes Constants]]
- [[_COMMUNITY_Backup Scripts|Backup Scripts]]
- [[_COMMUNITY_Products Test Suite|Products Test Suite]]
- [[_COMMUNITY_Vendor Auth Test|Vendor Auth Test]]
- [[_COMMUNITY_Root TypeScript Config|Root TypeScript Config]]
- [[_COMMUNITY_Vendor Admin Astro Config|Vendor Admin Astro Config]]
- [[_COMMUNITY_Vendor Admin Package JSON|Vendor Admin Package JSON]]
- [[_COMMUNITY_LogEntry Interface|LogEntry Interface]]
- [[_COMMUNITY_SDD Storefront UI|SDD Storefront UI]]
- [[_COMMUNITY_Production Runbook|Production Runbook]]
- [[_COMMUNITY_Smoke Test Script|Smoke Test Script]]
- [[_COMMUNITY_Load Test Script|Load Test Script]]

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
- `Service: db-seed (creates admin@tienda.com via GoTrue Admin API)` --conceptually_related_to--> `Table: vendor_whitelist (email-based vendor authorization)`  [INFERRED]
  docker-compose.yml → supabase/migrations/00021_vendor_whitelist.sql
- `getCurrentUser` --conceptually_related_to--> `Row Level Security (RLS) Policy Pattern`  [INFERRED]
  apps/client-hub/src/lib/auth/auth-client.ts → docs/Fix & Hardening Runbook.md
- `Fix 3: Secure nonce via pgsodium.crypto_secretbox_noncegen()` --rationale_for--> `Migration 00018: Fix Payment Encryption (pgsodium → pgcrypto)`  [INFERRED]
  docs/Correcciones Finales.md → supabase/migrations/00018_fix_payment_encryption.sql
- `Architecture Decision: Multi-layer security (RLS + MFA + AES-256)` --rationale_for--> `Pattern: pgp_sym_encrypt AES-256 with IV embedded`  [INFERRED]
  docs/ARCHITECTURE.md → supabase/migrations/00018_fix_payment_encryption.sql
- `Architecture Decision: Multi-layer security (RLS + MFA + AES-256)` --rationale_for--> `Pattern: mfa_verified in app_metadata JWT claim`  [INFERRED]
  docs/ARCHITECTURE.md → supabase/migrations/00020_audit_payment_tables.sql

## Hyperedges (group relationships)
- **Order Lifecycle (OrdersPage + OrderDetail + OrderClient + RealtimeSubscriptions)** — clienthub_page_orders_list, clienthub_page_order_detail, clienthub_order_client, concept_supabase_realtime, concept_order_timeline [EXTRACTED 0.95]
- **Checkout Flow (CheckoutPage + CheckoutClient + PaymentGateways)** — clienthub_page_checkout, clienthub_checkout_client, concept_payment_gateways, clienthub_e2e_checkout [EXTRACTED 0.90]
- **Storefront Catalog Data Pipeline** — catalog_ts, supabaseclient_storefront, storefront_index_page [EXTRACTED 0.95]
- **Vendor MFA Login Multi-Step Flow** — vendor_login_page, authclient_vendor, mfa_totp_flow [INFERRED 0.95]
- **Vendor Product CRUD with Storefront Rebuild Trigger** — vendor_products_page, productadmin_ts, triggerrebuild_fn [EXTRACTED 0.95]
- **Core Domain Layer: Enums + Models + Schemas form the shared domain contract** — enum_order_status, enum_fulfillment_status, enum_payment_gateway, enum_user_role, model_order, model_product, model_user, schema_order [INFERRED 0.95]
- **Order Lifecycle: OrderStatus, ItemFulfillmentStatus, and calculateOrderStatus together model order state transitions** — enum_order_status, enum_fulfillment_status, util_order_status_calculator [INFERRED 0.95]
- **Architecture Enforcement: check-architecture.sh enforces rules on core purity, no magic strings, no direct DB writes** — script_check_architecture, core_package, enum_order_status [EXTRACTED 1.00]
- **Multi-Gateway Payment Processing Pipeline** — fn_create_order, fn_payment_webhook, fn_manage_payment_gateways [INFERRED 0.85]
- **Vendor MFA Authentication Pipeline** — fn_login, fn_change_password, fn_setup_totp, fn_confirm_totp, fn_verify_totp [EXTRACTED 0.95]
- **BaseController Subclass Implementations** — core_base_controller, fn_create_order, fn_manage_orders, fn_manage_products, fn_manage_payment_gateways, fn_payment_webhook [EXTRACTED 1.00]
- **Shared Edge Function Infrastructure** — error_handler_handleError, logger_createLogger, supabase_client_getSupabaseClient, supabase_client_getSupabaseAdmin [INFERRED 0.95]
- **Order Lifecycle DB Functions** — db_fn_create_order_atomic, db_fn_confirm_order_payment, db_fn_update_order_status, db_fn_update_order_tracking, db_fn_update_order_status_manual, db_fn_update_item_fulfillment [INFERRED 0.95]
- **RLS MFA Vendor Policy Applied Tables** — db_table_products, db_table_orders, db_table_order_items, db_table_webhook_logs, storage_bucket_product_images [EXTRACTED 1.00]
- **Vendor MFA Access Control: app_metadata claim + profiles role + RLS policies** — mfa_verified_app_metadata, table_profiles, 00020_rls_audit_vendor_mfa [INFERRED 0.85]
- **Vendor Onboarding Chain: whitelist → handle_new_user → seed** — 00021_vendor_whitelist_table, 00022_handle_new_user_fn, 00026_seed_admin_user [EXTRACTED 0.95]
- **Payment Credential Security: encryption_key GUC + pgcrypto + service_role restriction** — encryption_key_guc, pgp_sym_encrypt_aes256, 00025_get_payment_credentials_fn [INFERRED 0.85]
- **Multi-Gateway Payment System (Stripe, PayPal, MercadoPago, HeyBanco)** — sprint3_stripe_integration, sprint3_paypal_integration, sprint3_mercadopago_integration, sprint3_hey_banco_integration [EXTRACTED 1.00]
- **Kong API Gateway Services (auth, rest, realtime, functions)** — kong_auth_service, kong_rest_service, kong_realtime_service, kong_functions_service [EXTRACTED 1.00]
- **Order Email Notification Flow** — send_order_email_fn, send_shipping_email_fn, resend_api_integration, shared_supabase_client [EXTRACTED 0.95]
- **Critical Security Vulnerabilities Triad** — audit_critical_totp_broken, audit_critical_webhook_no_sig, audit_critical_plaintext_creds [EXTRACTED 1.00]
- **Client-Hub Auth via Supabase SDK** — auth_client_signInWithEmail, auth_client_signInWithGoogle, auth_client_signUpWithEmail, auth_client_signOut, auth_client_supabaseClient [EXTRACTED 1.00]
- **Cadena de Fallos del Flujo de Autenticación Vendor** — audit2_totp_backdoor_verify, audit2_mfa_inconsistency, sprint1_totp_simulation [EXTRACTED 0.95]
- **Remediación de Seguridad de Pagos** — remediation1_webhook_hmac, remediation1_amount_validation, remediation1_idor_payment_gateways, remediation2_pgcrypto_credentials [EXTRACTED 0.95]
- **Pipeline de Entrega Sprint 0 a Sprint 5** — dod_sprint0, dod_sprint1, dod_sprint2, dod_sprint3, dod_sprint4, dod_sprint5 [EXTRACTED 0.95]
- **Core Domain Layer: Enums + Models + Schemas form the shared domain contract** — enum_order_status, enum_fulfillment_status, enum_payment_gateway, enum_user_role, model_order, model_product, model_user, schema_order [INFERRED 0.95]
- **Architecture Enforcement: check-architecture.sh enforces rules on core purity, no magic strings, no direct DB writes** — script_check_architecture, core_package, enum_order_status [EXTRACTED 1.00]
- **Order Lifecycle: OrderStatus, ItemFulfillmentStatus, and calculateOrderStatus together model order state transitions** — enum_order_status, enum_fulfillment_status, util_order_status_calculator [INFERRED 0.95]
- **Vendor MFA Authentication Pipeline** — fn_login, fn_change_password, fn_setup_totp, fn_confirm_totp, fn_verify_totp [EXTRACTED 0.95]
- **Multi-Gateway Payment Processing Pipeline** — fn_create_order, fn_payment_webhook, fn_manage_payment_gateways [INFERRED 0.85]
- **BaseController Subclass Implementations** — core_base_controller, fn_create_order, fn_manage_orders, fn_manage_products, fn_manage_payment_gateways, fn_payment_webhook [EXTRACTED 1.00]
- **Order Lifecycle DB Functions** — db_fn_create_order_atomic, db_fn_confirm_order_payment, db_fn_update_order_status, db_fn_update_order_tracking, db_fn_update_order_status_manual, db_fn_update_item_fulfillment [INFERRED 0.95]
- **RLS MFA Vendor Policy Applied Tables** — db_table_products, db_table_orders, db_table_order_items, db_table_webhook_logs, storage_bucket_product_images [EXTRACTED 1.00]
- **Shared Edge Function Infrastructure** — error_handler_handleError, logger_createLogger, supabase_client_getSupabaseClient, supabase_client_getSupabaseAdmin [INFERRED 0.95]
- **Payment Credential Security: encryption_key GUC + pgcrypto + service_role restriction** — encryption_key_guc, pgp_sym_encrypt_aes256, 00025_get_payment_credentials_fn [INFERRED 0.85]
- **Vendor MFA Access Control: app_metadata claim + profiles role + RLS policies** — mfa_verified_app_metadata, table_profiles, 00020_rls_audit_vendor_mfa [INFERRED 0.85]
- **Vendor Onboarding Chain: whitelist → handle_new_user → seed** — 00021_vendor_whitelist_table, 00022_handle_new_user_fn, 00026_seed_admin_user [EXTRACTED 0.95]
- **Multi-Gateway Payment System (Stripe, PayPal, MercadoPago, HeyBanco)** — sprint3_stripe_integration, sprint3_paypal_integration, sprint3_mercadopago_integration, sprint3_hey_banco_integration [EXTRACTED 1.00]
- **Nginx Subdomain Routing for Local Dev (storefront, client-hub, vendor-admin, kong)** — nginx_storefront_upstream, nginx_client_hub_upstream, nginx_vendor_admin_upstream, nginx_supabase_kong_upstream [EXTRACTED 1.00]
- **Kong API Gateway Services (auth, rest, realtime, functions)** — kong_auth_service, kong_rest_service, kong_realtime_service, kong_functions_service [EXTRACTED 1.00]

## Communities (88 total, 21 thin omitted)

### Community 0 - "Database Schema & Core Tables"
Cohesion: 0.07
Nodes (51): DB Enum: item_fulfillment_status, DB Enum: order_status, DB Enum: payment_gateway, DB Enum: user_role, DB Fn: check_password_change_required, DB Fn: confirm_order_payment, DB Fn: create_order_atomic, DB Fn: create_product (+43 more)

### Community 1 - "Payment Credentials & Transactions"
Cohesion: 0.05
Nodes (48): Migration 00018: Fix Payment Encryption (pgsodium → pgcrypto), Extension: pgcrypto (AES-256 symmetric encryption), Function: save_payment_credentials (pgcrypto AES-256 v1), Migration 00019: Fix Order Cancellation Stock Restoration, Function: update_order_status_manual (with stock restoration), Table: audit_logs (immutable audit trail), Migration 00020: Audit Logs & Payment Transactions, Function: confirm_order_payment (updated with transaction logging) (+40 more)

### Community 2 - "Backend Deployment & Routing"
Cohesion: 0.09
Nodes (47): Atomic Order Creation with Pessimistic Locking, Centralized CORS Management, HMAC-SHA256 Webhook Signature Verification, Vendor MFA Authentication Flow, Password Complexity Policy, Payment Amount Mismatch Detection (Anti-Fraud), Rate Limiting Pattern, Webhook Idempotency Pattern (+39 more)

### Community 3 - "Order & Payment Edge Functions"
Cohesion: 0.06
Nodes (37): SDD: Purchase Flow Diagram, SDD: Storefront SSG Rebuild Flow, SDD: Payment Webhook Confirmation Flow, SDD: Free Tier Infrastructure Strategy, SDD: Vendor Admin UI Design, Sprint 3: Checkout y Pagos, DB Function: confirm_order_payment, DB Function: create_order_atomic (+29 more)

### Community 4 - "Vendor Admin Client Library"
Cohesion: 0.11
Nodes (24): ../../layouts/VendorAdminLayout.astro, ../../lib/products/product-admin.ts, ../../lib/auth/auth-client, ../../lib/orders/order-admin, ../../lib/supabase-client, @micro-store/core, AdminOrder, AdminOrderDetail (+16 more)

### Community 5 - "Root Package Scripts"
Cohesion: 0.06
Nodes (30): devDependencies, husky, lint-staged, prettier, typescript, engines, node, name (+22 more)

### Community 6 - "Core Domain Types & Enums"
Cohesion: 0.11
Nodes (29): client-hub Astro Config, client-hub package.json, Astro Islands Pattern, NPM Workspaces Monorepo, @micro-store/eslint-config Package, API Routes Constants, Core Package Entry Point, @micro-store/core Package (+21 more)

### Community 7 - "Requirements & Technical Docs"
Cohesion: 0.13
Nodes (28): CRÍTICO-4: Plaintext Credential Fallback, CRÍTICO-1: TOTP Hardcoded Secret, CRÍTICO-3: Webhooks Sin Verificación de Firma, Cloudflare Pages Deploy Hook, Auditoría Técnica Profunda, Fix & Hardening Runbook, Sprint 0 — Configuración y Setup, SRS — Especificación de Requisitos (+20 more)

### Community 8 - "App Dependencies Config"
Cohesion: 0.08
Nodes (23): dependencies, alpinejs, astro, @astrojs/alpinejs, @astrojs/check, @astrojs/react, @micro-store/core, react (+15 more)

### Community 9 - "Vendor Auth & TOTP Flow"
Cohesion: 0.13
Nodes (24): AdminProduct Interface, AuthLayout (Vendor Admin), AuthResult Interface, BaseLayout (Storefront), Catalog Data Layer, CatalogProduct Interface, changePassword Function, confirmTOTP Function (+16 more)

### Community 10 - "TOTP Test Suite"
Cohesion: 0.08
Nodes (20): bytes, bytes1, bytes2, code1, code2, currentCode, currentValid, delta (+12 more)

### Community 11 - "Package Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, alpinejs, astro, @astrojs/alpinejs, @astrojs/check, @astrojs/react, @micro-store/core, react (+15 more)

### Community 12 - "Core Package Config"
Cohesion: 0.1
Nodes (20): dependencies, zod, description, devDependencies, typescript, vitest, exports, ./enums (+12 more)

### Community 13 - "Infrastructure & API Gateway"
Cohesion: 0.1
Nodes (21): Kong Service: auth-v1 (/auth/v1 → supabase-auth:9999), Kong Service: functions-v1 (/functions/v1 → supabase-functions:9000), Kong Service: realtime-v1 (/realtime/v1 → supabase-realtime:4000), Kong Service: rest-v1 (/rest/v1 → supabase-rest:3000), Kong API Gateway Config (kong.yml), Nginx Upstream: client-hub:5173, Nginx: nginx.conf (main config with WebSocket map), Nginx: microstore.conf (subdomain routing) (+13 more)

### Community 14 - "TypeScript Configuration"
Cohesion: 0.1
Nodes (19): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, module, moduleResolution (+11 more)

### Community 15 - "Package Dependencies B"
Cohesion: 0.11
Nodes (18): dependencies, alpinejs, astro, @astrojs/alpinejs, @astrojs/check, @micro-store/core, @supabase/supabase-js, typescript (+10 more)

### Community 16 - "Error Handling Utilities"
Cohesion: 0.14
Nodes (12): logger, supabaseAdmin, supabaseClient, logger, OrderFilters, TrackingUpdate, AppError, BusinessError (+4 more)

### Community 17 - "Order Domain Model"
Cohesion: 0.15
Nodes (12): ItemFulfillmentStatus, OrderStatus, PaymentGateway, Order, OrderItem, CreateOrderPayload, CreateOrderPayloadSchema, OrderTracking (+4 more)

### Community 18 - "Supabase Client Instances"
Cohesion: 0.14
Nodes (13): checks, logger, supabase, supabaseAdmin, logger, resendKey, supabaseAdmin, logger (+5 more)

### Community 19 - "Storefront Catalog Pages"
Cohesion: 0.2
Nodes (14): ../components/product/ProductCard.astro, ../../layouts/BaseLayout.astro, ../../lib/catalog/catalog.ts, ../styles/global.css, CatalogProduct, getAllProductSlugs(), getProductBySlug(), getVisibleProducts() (+6 more)

### Community 20 - "Client Hub App Layer"
Cohesion: 0.17
Nodes (17): Checkout Client, Checkout Flow E2E Test, ClientHubLayout Astro, Order Client, Order Client Tests, Auth Callback Page, Checkout Page, client-hub Index Page (+9 more)

### Community 21 - "Client Hub Auth Pages"
Cohesion: 0.15
Nodes (8): ../../layouts/ClientHubLayout.astro, ../lib/auth/auth-client, ../../lib/checkout/checkout-client, ../../lib/orders/order-client, ../lib/supabase-client, fetchOrders(), init(), loadCustomerOrders()

### Community 22 - "Docker Dev Stack"
Cohesion: 0.23
Nodes (15): Service: client-hub (Astro + React + Alpine.js, port 5173), docker-compose.yml: Full Local Development Stack, Service: db-migrate (applies all .sql migrations in order, runs once), Service: db-seed (creates admin@tienda.com via GoTrue Admin API), Service: inbucket (local email capture port 8025), Service: nginx (reverse proxy port 80), Service: storefront (Astro + Alpine.js, port 4321), Service: supabase-auth (GoTrue v2.151.0, JWT + MFA) (+7 more)

### Community 23 - "Security Audit Round 2"
Cohesion: 0.18
Nodes (15): CLABE Hardcodeada Hey Banco (C3), CORS Wildcard en todos los endpoints (C6), Doble Autenticación por Request, Email Hardcodeado para Vendor Role (C7), localStorage auth_token en Checkout (C4), localStorage auth_token en Settings (C5), Rate Limiting Fail-Open (C10), Policies RLS Contradictorias (AMR vs app_metadata) (+7 more)

### Community 24 - "Vendor Admin App UI"
Cohesion: 0.22
Nodes (14): AdminOrder Interface, Auth Client (Vendor Admin), getVendorAuthHeader Function, Order Admin Client, Product Admin Client, signOut Function, Supabase Client (Vendor Admin), triggerRebuild Function (+6 more)

### Community 25 - "Logging Infrastructure"
Cohesion: 0.19
Nodes (8): logger, getLogflareClient(), LogflareClient, LogflareConfig, logger, createLogger(), LogEntry, LogLevel

### Community 26 - "Client Hub Auth Flow"
Cohesion: 0.18
Nodes (7): ../../lib/auth/auth-client.ts, AuthResult, getCurrentUser(), signOut(), signUpWithEmail(), handleRegister(), loadProfile()

### Community 27 - "Webhook Test Suite"
Cohesion: 0.15
Nodes (9): existingLog, expectedCents, header, parts, tamperedBody, timestamp, tPart, v1Part (+1 more)

### Community 28 - "Checkout Client"
Cohesion: 0.2
Nodes (8): ../../lib/supabase-client.ts, CheckoutResult, createOrder(), getAuthHeader(), HeyBancoInstructions, PaymentResult, ShippingAddress, supabaseClient

### Community 29 - "Base Controller & Auth"
Cohesion: 0.18
Nodes (5): authenticateUser(), requireAdminMFA(), CreateProductSchema, logger, UpdateProductSchema

### Community 30 - "Payment Webhook Controller"
Cohesion: 0.35
Nodes (4): PaymentWebhookController, verifyHeyBancoSignature(), verifyMercadoPagoSignature(), verifyStripeSignature()

### Community 31 - "Sprint DoDs & Security Fixes"
Cohesion: 0.2
Nodes (11): Inconsistencia MFA user_metadata vs app_metadata (C2), Backdoor TOTP en verify-totp (C1), DoD Sprint 0 Infraestructura y Entorno, DoD Sprint 1 Autenticación y Perfiles, Reescritura verify-totp con TOTP Real, Metodología Docker-First, Migración 00001 Initial Schema, Estructura Monorepo npm Workspaces (+3 more)

### Community 32 - "Error Types & Validation"
Cohesion: 0.18
Nodes (7): logger, supabaseAdmin, delta, logger, supabaseAdmin, totp, UnauthorizedError

### Community 33 - "Vendor Auth Client"
Cohesion: 0.31
Nodes (8): ../../layouts/AuthLayout.astro, ../../lib/auth/auth-client.ts, base(), changePassword(), confirmTOTP(), setupTOTP(), vendorSignIn(), verifyTOTP()

### Community 34 - "Order Detail Client"
Cohesion: 0.24
Nodes (8): generateTimeline(), loadOrderDetail(), mapToViewModel(), OrderItemViewModel, OrderViewModel, RawOrder, RawOrderItem, TimelineStep

### Community 35 - "Misc Package Config"
Cohesion: 0.2
Nodes (9): devDependencies, eslint, eslint-config-prettier, eslint-plugin-astro, eslint-plugin-react, main, name, private (+1 more)

### Community 36 - "Software Design Document"
Cohesion: 0.22
Nodes (10): SDD: Role-Based Access Matrix, SDD: System Architecture Overview, SDD: Entity-Relationship Data Model, SDD: Database ENUM Types Definition, SDD: Vendor MFA Auth Flow Diagram, SDD: Monorepo Component Diagram, SDD: Jamstack + Hexagonal Architecture Patterns, SDD: 5-Layer Security Design (+2 more)

### Community 37 - "First Remediation Report"
Cohesion: 0.22
Nodes (9): Validación de Monto en Webhooks, Tablas audit_logs y payment_transactions, Corrección IDOR Gateways de Pago, Validación de Complejidad de Contraseña, Rate Limiting en Login, Remediation Report Primera Ronda, Restauración de Stock en Cancelaciones, Secret TOTP Único por Usuario (+1 more)

### Community 38 - "Auth Client Tests"
Cohesion: 0.36
Nodes (8): AuthResult Interface, getCurrentUser, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, supabaseClient (client-hub), Auth Client Test Suite

### Community 39 - "Logging & Error Classes"
Cohesion: 0.29
Nodes (8): AppError Class, BusinessError Class, UnauthorizedError Class, handleError Function, LogflareClient Class, LogflareConfig Interface, getLogflareClient Singleton Factory, createLogger Function

### Community 40 - "Payment Encryption"
Cohesion: 0.29
Nodes (8): Nonce Seguro pgsodium.crypto_secretbox_noncegen, pgcrypto para Credenciales de Pago, Client Hub: checkout-client.ts Library, Client Hub: Checkout Page (multi-step), Edge Function: manage-payment-gateways, pgsodium Credential Encryption, DB Function: save_payment_credentials (pgsodium), Vendor Admin: Gateway Settings Page

### Community 43 - "DoD Final Corrections"
Cohesion: 0.48
Nodes (7): Networking Docker host.docker.internal, DoD Correcciones Finales, DoD Fix and Hardening, MFA Robusto en RLS Compatibilidad Free Tier, Rate Limiting SQL Puro, Storage RLS Bucket product-images, Idempotencia de Webhooks webhook_logs

### Community 44 - "Setup TOTP Function"
Cohesion: 0.29
Nodes (6): logger, otpauthUrl, secret, secretBytes, supabaseAdmin, totp

### Community 46 - "Core TypeScript Config"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 47 - "Sprint 4-5 DoDs"
Cohesion: 0.33
Nodes (6): DoD Sprint 4 Pedidos y Logística, DoD Sprint 5 Despliegue y Cierre, Notificaciones Realtime de Pedidos, Máquina de Estados de Órdenes en PL/pgSQL, Despliegue en Cloudflare Pages, Integración Logflare para Observabilidad

### Community 48 - "Sprint 2-3 DoDs"
Cohesion: 0.33
Nodes (6): DoD Sprint 2 Catálogo y Productos, DoD Sprint 3 Checkout y Pagos, Generación Automática de Slugs en BD, Catálogo SSG con Astro, Creación Atómica de Órdenes con FOR UPDATE, Múltiples Pasarelas de Pago

### Community 49 - "Verify TOTP Function"
Cohesion: 0.33
Nodes (5): delta, logger, secret, supabaseAdmin, totp

### Community 50 - "Auth Client Test Mocks"
Cohesion: 0.33
Nodes (5): mockGetUser, mockSignInWithOAuth, mockSignInWithPassword, mockSignOut, mockSignUp

### Community 53 - "Order Shared Schemas"
Cohesion: 0.4
Nodes (4): CreateOrderPayloadSchema, logger, OrderRpcResult, ShippingAddressSchema

### Community 55 - "CI Architecture Rules"
Cohesion: 0.5
Nodes (4): Script: check-architecture.sh (CI architecture validator), CLAUDE.md: Project Developer Guide, Architecture Rules: 5 CI-enforced constraints, NPM Workspaces Monorepo Pattern

### Community 58 - "Rate Limiting Database"
Cohesion: 1.0
Nodes (3): DB Fn: check_rate_limit, DB Table: rate_limits, Migration 00016: Rate Limiting

## Knowledge Gaps
- **374 isolated node(s):** `name`, `version`, `private`, `dev`, `dev:stop` (+369 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pgsodium Credential Encryption` connect `Payment Encryption` to `Sprint 2-3 DoDs`, `Software Design Document`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `DB Function: save_payment_credentials (pgsodium)` connect `Payment Encryption` to `Order & Payment Edge Functions`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `Edge Function: create-order` connect `Order & Payment Edge Functions` to `Payment Encryption`, `Infrastructure & API Gateway`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _374 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Database Schema & Core Tables` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Payment Credentials & Transactions` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Backend Deployment & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._