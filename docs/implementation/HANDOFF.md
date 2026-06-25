# HANDOFF.md — Current State
> Overwrite-only. Representa el estado AHORA.
> Para historia, ver HISTORY.log.

**Date:** 2026-06-25
**Active Branch:** feature/PT-020-audit-ci-gate
**Sprint:** S-003 prep — PT-021/022/023 DONE · PT-014/PT-020 DONE (listos para PR) · PT-015/016/017 pendientes
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
| PT-020 | FEATURE | TRIVIAL | npm audit CI gate (`--audit-level=high`) | **DONE** ✅ — listo para PR (después de PT-014) |
| PT-021 | REFACTOR | TRIVIAL | Documentar `payment_transactions` en 07-DB-Architecture | **DONE** ✅ |
| PT-022 | FEATURE | STANDARD | Configurar alertas Logflare (umbrales F-1) | **STATE 1-E** — **BLOQUEADO** (PT-016/PE-002) |
| PT-023 | FEATURE | MAJOR | Edge Function Test Coverage Phase 2 | **DONE** ✅ — listo para PR |

---

## Estado Actual del Sistema (en main)

```
check-architecture.sh:       EXIT 0 ✅
npm audit (main):            7 HIGH CVEs (astro@5 — resuelto en PT-014, pendiente merge)
astro version (main):        5.x (PT-014 upgrada a 7.0.2)
Inline styles:               0 (RULE-02 clean) ✅
Core tests:                  26 tests, 4 files ✅
Edge Function tests (main):  74 tests, 8 files (PT-023 añade 14 más, pendiente merge)
Total test suite (main):     112 tests ✅
vendor_whitelist:            enforced en login/index.ts ✅
TOTP secrets:                AES-256 BYTEA en DB ✅
Business metrics:            order.created/failed + payment.webhook.* → Logflare ✅
PTSA hallazgos (main):       12/12 CERRADAS ✅ (H-013 cerrará con PT-014 merge)
```

## Estado Post-Merge (proyectado)

```
npm audit:                   0 vulnerabilities ✅ (PT-014)
astro version:               7.0.2 ✅ (PT-014)
Total test suite:            126 tests ✅ (PT-023 +14)
CI audit gate:               activo ✅ (PT-020)
PTSA hallazgos:              13/13 CERRADAS ✅ (H-013 → CERRADA)
Health PTSA:                 100 ✅
```

---

## Branches Listos para PR → main

| Branch | PT | Merge order |
|:-------|:---|:------------|
| `feature/PT-023-ef-phase2-tests` | PT-023 | 1º — no dependencies |
| `fix/PT-014-astro7-upgrade` | PT-014 | 2º — no dependencies |
| `feature/PT-020-audit-ci-gate` | PT-020 | 3º — después de PT-014 |

---

## Documentación Enterprise — Estado

| Doc | Estado | Última actualización |
|:---|:---|:---|
| 07-Database-Architecture.md | ✅ SYNC | PT-021 |
| 08-API-Catalog.md | ✅ SYNC | PT-018 |
| 03-TRD.md | ⚠️ PENDIENTE | Actualizar engines.node ≥22.12.0 y astro@7 (post-PT-014 merge) |
| 11-Conventions.md | ⚠️ PENDIENTE | Documentar Rolldown manualChunks + getStaticPaths() (post-PT-014 merge) |

---

## Deuda Técnica Restante

| Item | Severidad | PT |
|:---|:---|:---|
| Edge Function tests mock-based (no integration) | Bajo | PT-015 MAJOR (STATE 1) |
| D5 nunca puntuado — Logflare prod no verificado | Bajo | PT-016 STANDARD (STATE 1, may be BLOCKED) |
| 0 tests en storefront + vendor-admin frontend | Bajo | PT-017 MAJOR (STATE 1) |
| 03-TRD.md + 11-Conventions.md: astro@7 no documentado | Mínimo | Post-PT-014 merge |

---

## Próximos Pasos (orden recomendado)

### Merge inmediato
1. PR `feature/PT-023-ef-phase2-tests` → main
2. PR `fix/PT-014-astro7-upgrade` → main
3. PR `feature/PT-020-audit-ci-gate` → main (después de PT-014)

### Tras merge
4. `audit PTSA` — formalizar Health=100 (H-013 CERRADA).
5. Actualizar **03-TRD.md** + **11-Conventions.md** con astro@7 specifics.
6. `/graphify src/ --update` — actualizar knowledge graph.

### PTs pendientes STATE 2
7. **PT-015** (MAJOR FEATURE): integration tests EF (real Supabase)
8. **PT-017** (MAJOR FEATURE): frontend tests storefront + vendor-admin
9. **PT-016** (STANDARD): verificar Logflare prod (puede quedar BLOCKED)
