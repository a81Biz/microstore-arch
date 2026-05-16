# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Graphify — Knowledge Graph Context

Este repositorio tiene un grafo de conocimiento vivo en `graphify-out/`.

**OBLIGATORIO antes de explorar archivos:**
1. Lee `graphify-out/GRAPH_REPORT.md` — contiene god nodes, comunidades, conexiones sorprendentes y preguntas sugeridas.
2. Consulta `graphify-out/graph.json` o usa `/graphify query "<pregunta>"` para localizar nodos antes de abrir archivos individuales.
3. Ejecuta `/graphify . --update` después de cualquier cambio significativo de código para mantener el grafo actualizado.

El grafo reduce el costo de exploración en ~32x. Úsalo como primer punto de entrada, no los archivos directamente.

---

## Protocolo de Cuota — Plan Antes de Implementar

**Regla estricta:** Antes de cualquier implementación debes:

1. Crear o actualizar `docs/implementation/PLAN_ACTUAL.md` con:
   - Objetivo de la tarea
   - Archivos que se van a modificar (máximo 2 por turno — ver Segmentación)
   - Pasos ordenados
   - Riesgos identificados
2. Esperar la aprobación explícita del usuario (**ACK**) antes de escribir una sola línea de código.

No existe excepción a esta regla. Cambios de una línea, refactors triviales y fixes urgentes siguen el mismo protocolo.

---

## Segmentación — Máximo 2 Archivos por Turno

- **Prohibido** modificar más de 2 archivos en un mismo turno de conversación.
- Si la tarea requiere modificar 3 o más archivos, divídela en sub-tareas y regístralas en `PENDING_TASKS.md` en la raíz antes de comenzar.
- Cada sub-tarea debe tener su propio ACK.

---

## Persistencia — Log de Progreso

Al finalizar cada tarea exitosa (tests pasan, arquitectura válida), añade una entrada al final de `docs/implementation/HISTORY.log` con el formato:

```
[YYYY-MM-DD] <título breve de la tarea>
  Archivos: <lista de archivos modificados>
  Resultado: <qué cambió y por qué>
```

Si `docs/implementation/` no existe, créalo antes de escribir el log.

---

## Commands

```bash
# Development (Docker — primary workflow)
docker compose up --build          # Start all services
docker compose down                # Stop services
docker compose down -v && docker compose up --build  # Full reset

# Workspace-wide
npm run build --workspaces --if-present
npm run lint --workspaces --if-present
npm run typecheck --workspaces --if-present
npm run test --workspaces --if-present

# Core package only
npm run test:core                  # Run tests in packages/core
cd packages/core && npm run test:watch  # Watch mode

# Architecture validation (runs in CI)
bash scripts/check-architecture.sh
```

## Architecture Overview

This is an e-commerce monorepo with **npm workspaces** deploying to Cloudflare Pages + Supabase.

### Apps (`apps/`)

| App | Framework | Port | Purpose |
|-----|-----------|------|---------|
| `storefront` | Astro 5 + Alpine.js | 4321 | Public catalog and product browsing |
| `client-hub` | Astro 5 + React 18 + Alpine.js | 5173 | Customer dashboard (auth, orders, checkout) |
| `vendor-admin` | Astro 5 + React 18 + Alpine.js | 5174 | Vendor panel (products, orders, settings) |

All apps use the **Astro + Islands pattern**: Astro handles static markup and SSR; React is used only for interactive UI components. Alpine.js is acceptable for minimal interactivity.

### Packages (`packages/`)

- **`@micro-store/core`** — Shared domain layer: TypeScript interfaces (Order, Product, User), enums (OrderStatus, ItemFulfillmentStatus, PaymentGateway, UserRole), Zod schemas, and utilities. Tested with Vitest.
- **`@micro-store/eslint-config`** — Shared ESLint config (Astro + React + Prettier plugins).

### Backend: Supabase + Edge Functions

All business logic lives in Supabase Edge Functions (Deno runtime) under `supabase/functions/`:

| Function | Role |
|----------|------|
| `create-order` | Order creation with RLS validation |
| `manage-orders` | Read/update/delete orders |
| `manage-products` | Product CRUD |
| `manage-payment-gateways` | Payment config |
| `payment-webhook` | Idempotent webhook handling |
| `login`, `change-password`, `confirm-totp` | Auth operations |

Database migrations live in `supabase/migrations/` (numbered `00001_` → `00008_`).

## Architecture Rules (Enforced by CI)

`scripts/check-architecture.sh` blocks PRs that violate these:

1. **No HTML in `.ts` files** — markup belongs in `.astro` or `.tsx`.
2. **No inline styles in `.astro`** — use external `.css` files.
3. **No magic strings for order statuses** — always import from `@micro-store/core/enums`.
4. **No direct Supabase writes in frontend** — reads go through the Supabase client (`supabase-client.ts`); all writes (insert/update/delete) must call an Edge Function.
5. **Core package purity** — `packages/core` must not import from `astro`, `react`, or `supabase`.

## Key Conventions

- **TypeScript strict mode** everywhere; no `any` types.
- **Prettier**: 100-char line width, 2-space indent, single quotes.
- **Pre-commit hook** (Husky): runs `npm test` before every commit.
- Enums from `@micro-store/core` are the source of truth — never hardcode status strings.
- RLS policies are enforced at the database level; Edge Functions add a second validation layer.

## Environment Variables

Copy `.env.example` to `.env`. Required variables:

```
SUPABASE_URL / SUPABASE_INTERNAL_URL
SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
ENCRYPTION_KEY                   # 64-char hex key for dev
PUBLIC_STOREFRONT_URL
PUBLIC_CLIENT_HUB_URL
PUBLIC_VENDOR_ADMIN_URL
```

Local Supabase ports: `8000` (API/Kong), `54322` (Postgres), `8323` (Studio UI), `8025` (Inbucket email).

## CI/CD

- **`ci.yml`**: On push/PR → architecture check → lint → typecheck → core tests.
- **`deploy.yml`**: On push to `main` → build all apps → deploy to Cloudflare Pages → deploy Edge Functions → run migrations → health check.
- Node requirement: `>=22.0.0` (Node 22 LTS).


## Operational Mode: Cascading State Protocol (Strict)

### PHASE 1: Audit & State (SESSION_SUMMARY.md)
* **Action**: Analyze logs/infra (db-seed, migrations, docker-compose).
* **Deliverable**: Delta update to `docs/implementation/SESSION_SUMMARY.md`.
* **STOP**: Wait for User ACK. Do not plan, do not code.

### PHASE 2: Strategy (PLAN_ACTUAL.md)
* **Action**: Design technical path + Task ID (PT-XXX) from history.
* **STOP**: Wait for User ACK.

### PHASE 3: Registration (PENDING_TASKS.md)
* **Action**: Atomize plan into numbered tasks.
* **STOP**: Wait for User ACK.

### PHASE 4: Execution & Cleanup (HISTORY.log + Documentation)
* **Action**: Execute -> Verify -> Update `HISTORY.log` -> Purge `PENDING_TASKS.md`.
* **Documentation**: Update `README.md`, `HANDOFF.md`, and run `/graphify . --update` ONLY in this phase if architecture changed.

### Strict Rules:
1. **Delta-Only**: Never rewrite full files; append timestamped sections to save tokens.
2. **No Chat-Verbose**: Reasoning goes to docs, not chat.
3. **Infra-First**: Audit `docker-compose.yml` for real service names before any Docker command.