# PENDING_TASKS.md
> Updated: 2026-06-24 — STATE 7 completo. Sprint FPGE S-001 cerrado.

## Sprint Status — CERRADO

| PT | Título | Tipo | Estado Final | Validación |
|:---|:---|:---|:---|:---|
| PT-001 | Fix check-architecture.sh false positives | BUG STD | **CLOSED** | ✅ EXIT 0 en Docker Alpine 2026-06-24 |
| PT-002 | @micro-store/core unit tests | BUG STD | **CLOSED** | ✅ 26 tests en Docker 2026-06-24 |
| PT-003 | Edge Function test suite (Phase 1) | BUG MAJ | **CLOSED** | ✅ 76 tests en Docker 2026-06-24 |
| PT-004 | TOTP secret encryption (pgcrypto) | BUG STD | **CLOSED** | ✅ totp_secret=bytea en DB 2026-06-24 |
| PT-005 | vendor_whitelist enforcement in login | FEATURE STD | **DONE** | ✅ 4 ACs verificados por tests |
| PT-006 | npm audit fix (vitest CVE) | BUG TRV | **CLOSED** | ✅ 0 CVEs críticos en Docker 2026-06-24 |
| PT-007 | Inline styles removed (RULE-02) | BUG TRV | **CLOSED** | ✅ Visual confirmado 2026-06-24 |
| PT-008 | CLOUDFLARE_DEPLOY_HOOK_URL en .env.example | BUG TRV | **CLOSED** | ✅ Confirmado 2026-06-24 |
| PT-009 | Business metrics to Logflare | FEATURE STD | **DONE** | ✅ ACs verificados por tests |
| PT-010 | Cart limit 15 SKUs server-side | FEATURE TRV | **DONE** | ✅ BR-004 verificado por test |
| PT-011 | Migration 00027 gap investigation | INVESTIGATION | **CLOSED** | ✅ Nunca existió, sin impacto |
| PT-012 | Zod schema duplication (accepted debt) | REFACTOR TRV | **DONE** | ✅ Documentado en 10-Technical-Debt.md |

---

## Test Suite Final

```
@micro-store/client-hub        →  12 tests  (3 files)  ✅
@micro-store/core              →  26 tests  (4 files)  ✅
@micro-store/edge-functions    →  76 tests  (9 files)  ✅
                      TOTAL:     114 tests — ALL GREEN
```

---

## PTSA Hallazgos — Estado Final

| Hallazgo | PT | Estado |
|:---|:---|:---|
| H-001 | PT-001 | CERRADA |
| H-002 | PT-002 | CERRADA |
| H-003 | PT-003 | CERRADA |
| H-004 | PT-007 | CERRADA |
| H-005 | PT-006 | CERRADA |
| H-006 | PT-004 | CERRADA |
| H-007 | PT-012 | CERRADA |
| H-008 | PT-011 | CERRADA |
| H-009 | PT-008 | CERRADA |
| H-010 | PT-005 | CERRADA |
| H-011 | PT-009 | CERRADA |
| H-012 | PT-010 | CERRADA |

---

## Próximos Pasos (Sprint S-001 → cumplidos)

- ✅ Run `/graphify . --update` — cubierto por PT-019
- ✅ `[START FPGE]` — FPGE S-002 ejecutado, 7 ítems promovidos
- ✅ 2 HIGH CVEs restantes → PT-014 (astro@7 upgrade)
- ✅ Integration tests con Supabase real → PT-015

---

# Sprint S-002 — PT-013 → PT-019

> Updated: 2026-06-24 — STATE 1 ACTIVO. ACK colectivo pendiente.

| PT | ID Roadmap | Tipo | Complejidad | Título | Estado |
|:---|:---|:---|:---|:---|:---|
| PT-013 | R-013 | INVESTIGATION | TRIVIAL | Resolver PE-001 — BD live + queries PTSA | **CLOSED** ✅ |
| PT-014 | R-014 | BUG | MAJOR | astro@7 upgrade (7 HIGH CVEs: vite + astro) | **STATE 3 / PROPOSAL GATE** |
| PT-015 | R-015 | FEATURE | MAJOR | Integration tests Edge Functions (real Supabase) | **STATE 1-E** |
| PT-016 | R-016 | INVESTIGATION | STANDARD | Verificar D5 Operational Reliability (prod/Logflare) | **STATE 1-B** |
| PT-017 | R-017 | FEATURE | MAJOR | Test coverage frontend (storefront + vendor-admin) | **STATE 1-E** |
| PT-018 | R-018 | REFACTOR | TRIVIAL | Actualizar API Catalog (08-API-Catalog.md) | **DONE** ✅ |
| PT-019 | R-019 | REFACTOR | TRIVIAL | Actualizar graphify knowledge graph | **DONE** ✅ |

## Artefactos STATE 1 generados (S-002)

| Artefacto | PTs cubiertos |
|:---|:---|
| `DISCOVERY.md` | PT-013, PT-014, PT-016 |
| `ENRICHMENT.md` | PT-015, PT-017 |
| `REFACTOR_SCOPE.md` | PT-018, PT-019 |
| `CONTEXT_ANALYSIS.md` | PT-014, PT-015, PT-016, PT-017 |
| `PLAN_ACTUAL.md` | Sprint S-002 completo |

---

# Sprint S-003 prep — PT-020 → PT-023
> Updated: 2026-06-25 — FPGE S-003 completado, 4 ítems promovidos a STATE 1.

| PT | Roadmap | Tipo | Complejidad | Título | Estado |
|:---|:---|:---|:---|:---|:---|
| PT-020 | R-021 | FEATURE | TRIVIAL | npm audit CI gate (`--audit-level=high`) | **STATE 1-E EXPRESS** — BLOQUEADO (PT-014) |
| PT-021 | R-022 | REFACTOR | TRIVIAL | Documentar `payment_transactions` en 07-DB-Architecture | **DONE** ✅ |
| PT-022 | R-023 | FEATURE | STANDARD | Configurar alertas Logflare (umbrales F-1) | **STATE 1-E** — BLOQUEADO (PT-016) |
| PT-023 | R-020 | FEATURE | MAJOR | Edge Function Test Coverage Phase 2 | **DONE** ✅ |

## Artefactos STATE 1 generados (S-003 prep)

| Artefacto | PTs cubiertos |
|:---|:---|
| `ENRICHMENT.md` (secciones PT-020, PT-022, PT-023) | PT-020, PT-022, PT-023 |
| `PLAN_ACTUAL.md` (sección PT-021 STATE 1-R EXPRESS) | PT-021 |
