# HANDOFF.md — Current State
> Overwrite-only. Representa el estado AHORA.
> Para historia, ver HISTORY.log.

**Date:** 2026-06-25
**Active Branch:** fix/PT-014-astro7-upgrade
**Sprint:** S-003 prep — PT-021/022/023 DONE · PT-014 DONE (listo para PR) · PT-015/016/017/020 pendientes
**FPGE:** Corrida S-003 completada (R-020→R-023 APROBADOS → PT-020→PT-023)

---

## Estado Sprint S-002 / S-003 prep

| PT | Tipo | Complejidad | Título | Estado |
|:---|:---|:---|:---|:---|
| PT-013 | INVESTIGATION | TRIVIAL | Resolver PE-001 — BD live + queries PTSA | **CLOSED** ✅ |
| PT-014 | BUG | MAJOR | astro@7 upgrade (7 HIGH CVEs: astro + vite) | **DONE** ✅ — listo para PR |
| PT-015 | FEATURE | MAJOR | Integration tests Edge Functions (real Supabase) | **STATE 1-E** (pendiente STATE 2) |
| PT-016 | INVESTIGATION | STANDARD | Verificar D5 Operational Reliability (prod/Logflare) | **STATE 1-B** (pendiente STATE 2, may be BLOCKED) |
| PT-017 | FEATURE | MAJOR | Test coverage frontend (storefront + vendor-admin) | **STATE 1-E** (pendiente STATE 2) |
| PT-018 | REFACTOR | TRIVIAL | Actualizar API Catalog (08-API-Catalog.md) | **DONE** ✅ |
| PT-019 | REFACTOR | TRIVIAL | Actualizar graphify knowledge graph | **DONE** ✅ |
| PT-020 | FEATURE | TRIVIAL | npm audit CI gate (`--audit-level=high`) | **STATE 1-E EXPRESS** — DESBLOQUEADO (PT-014 ✅) |
| PT-021 | REFACTOR | TRIVIAL | Documentar `payment_transactions` en 07-DB-Architecture | **DONE** ✅ |
| PT-022 | FEATURE | STANDARD | Configurar alertas Logflare (umbrales F-1) | **STATE 1-E** — **BLOQUEADO** (PT-016/PE-002) |
| PT-023 | FEATURE | MAJOR | Edge Function Test Coverage Phase 2 | **DONE** ✅ |

---

## Estado Actual del Sistema

```
check-architecture.sh:       EXIT 0 ✅ (reescrito para Alpine/BusyBox + LF line endings)
npm audit:                   0 vulnerabilities ✅ (7 HIGH CVEs CERRADAS — PT-014 DONE)
astro version:               7.0.2 (storefront, client-hub, vendor-admin) ✅
Builds:                      3/3 apps EXIT 0 ✅ (storefront, client-hub, vendor-admin)
Inline styles:               0 (RULE-02 clean) ✅
CLOUDFLARE_DEPLOY_HOOK_URL:  documentado en .env.example ✅
Cart limit:                  15 SKUs server-side (manage-cart/syncCart) ✅
Core tests:                  26 tests, 4 files ✅
Edge Function tests:         88 tests, 12 files ✅
Total test suite:            126 tests — ALL GREEN ✅
vendor_whitelist:            enforced en login/index.ts ✅
TOTP secrets:                AES-256 BYTEA en DB ✅
Business metrics:            order.created/failed + payment.webhook.* → Logflare ✅
API catalog:                 SINCRONIZADO ✅ (PT-018)
Knowledge graph:             ACTUALIZADO ✅ (PT-019: 2442 nodos, 3652 edges, 2026-06-24)
payment_transactions:        DOCUMENTADO ✅ (PT-021)
payment-webhook flaky test:  CORREGIDO ✅ (PT-023: suffix determinístico)
Active branches:             fix/PT-014-astro7-upgrade (listo para PR/merge)
                             feature/PT-023-ef-phase2-tests (listo para PR/merge)
PTSA hallazgos:              13/13 CERRADAS ✅ (H-013 → CERRADA con PT-014)
```

---

## Documentación Enterprise — Estado

| Doc | Estado | Última actualización |
|:---|:---|:---|
| 07-Database-Architecture.md | ✅ SYNC | PT-021 (§3.11 payment_transactions, §5 RLS row añadida) |
| 08-API-Catalog.md | ✅ SYNC | PT-018 (POST /login: 403 VENDOR_NOT_AUTHORIZED) |
| 03-TRD.md | ⚠️ PENDIENTE | Actualizar engines.node ≥22.12.0 y astro@7 (post-PT-014 merge) |
| 11-Conventions.md | ⚠️ PENDIENTE | Documentar Rolldown manualChunks rule y getStaticPaths() requirement (post-PT-014 merge) |
| Resto docs enterprise | Refleja estado post-Foundation + sprint S-001 | 2026-06-24 |

---

## Deuda Técnica Restante

| Item | Severidad | PT |
|:---|:---|:---|
| Edge Function tests mock-based (no integration) | Bajo | PT-015 MAJOR (STATE 1, depende de PT-013 ✅) |
| D5 nunca puntuado — Logflare prod no verificado | Bajo | PT-016 STANDARD (STATE 1, may be BLOCKED) |
| 0 tests en storefront + vendor-admin frontend | Bajo | PT-017 MAJOR (STATE 1, pendiente STATE 2) |
| 03-TRD.md + 11-Conventions.md: astro@7 no documentado | Mínimo | Post-PT-014 merge (no bloquea nada) |

---

## PTSA Audit State (Post-PT-014)

| Dimensión | S-002 | Post-PT-014 | Delta |
|:---|---:|---:|:---|
| D1 Domain | 100 | **100** | — |
| D2 Architectural | 95 | **100** | **+5** (H-013 CERRADA) |
| D3 Observability | 100 | **100** | — |
| D4 Documentary | 100 | **100** | — |
| **Health** | **98.5** | **100** | **+1.5** |
| Risk | 16 | **0** | **−16** |
| Clasificación | A | **A** | — |

H-013: **CERRADA** ✅ (7 HIGH CVEs cerradas con PT-014).
PTSA PE-002: ABIERTO (sin acceso logs prod — PT-016 investigará).
Próximo checkpoint: `audit PTSA` para formalizar Health=100 · S-003 general 2026-09-24.

---

## Próximos Pasos (orden recomendado)

### Merge / cierre inmediato
1. **PT-023** branch `feature/PT-023-ef-phase2-tests` → PR → merge a main.
   126 tests ALL GREEN. Commits limpios. Sin cambios en código fuente de EFs.
2. **PT-014** branch `fix/PT-014-astro7-upgrade` → PR → merge a main.
   0 vulnerabilities, 3 builds EXIT 0, 126 tests GREEN, typecheck EXIT 0, architecture EXIT 0.

### Tras merge de PT-014 (DESBLOQUEADOS)
3. **PT-020** (TRIVIAL FEATURE): STATE 4 — añadir `npm audit --audit-level=high` a ci.yml. ~5 min.
4. **`audit PTSA`** — formalizar Health=100 (H-013 CERRADA).
5. Actualizar **03-TRD.md** y **11-Conventions.md** con astro@7 specifics (Rolldown, getStaticPaths).
6. `/graphify src/ --update` — actualizar knowledge graph con cambios de PT-014 en src/.

### PTs MAJOR pendientes STATE 2
7. **PT-015** (MAJOR FEATURE): STATE 2 — PE-001 ✅ resuelto. Integration tests create-order, login, manage-orders.
8. **PT-017** (MAJOR FEATURE): STATE 2 independiente — frontend tests storefront + vendor-admin.

### Cuando PT-016 resuelva (PE-002)
9. **PT-016** (STANDARD): STATE 2 — verificar Logflare prod. Puede quedar BLOCKED si sin acceso.
10. **PT-022** (STANDARD FEATURE): STATE 2 → desbloqueado cuando PT-016 cierre.
