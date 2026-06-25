# PENDING_TASKS.md
> Updated: 2026-06-24 — All PTs from FPGE sprint DONE.

## Sprint Status — All Complete

| PT | Title | Status | Branch |
|:---|:---|:---|:---|
| PT-001 | Fix check-architecture.sh false positives | DONE | fix/PT-001-check-architecture-sh |
| PT-002 | @micro-store/core unit tests | DONE | feat/PT-002-core-tests |
| PT-003 | Edge Function tests Phase 1 | DONE | feat/PT-003-edge-function-tests |
| PT-004 | TOTP secret encryption (pgcrypto) | VALIDATION_PENDING | fix/PT-004-totp-encryption |
| PT-005 | vendor_whitelist enforcement in login | VALIDATION_PENDING | feat/PT-005-vendor-whitelist-login |
| PT-006 | npm audit fix (vitest CVE) | DONE | main (inline) |
| PT-007 | Inline styles removed | DONE | main (inline) |
| PT-008 | CLOUDFLARE_DEPLOY_HOOK_URL in .env.example | DONE | main (inline) |
| PT-009 | Business metrics to Logflare | DONE | feat/PT-009-business-metrics |
| PT-010 | Cart limit 15 SKUs server-side | DONE | main (inline) |
| PT-011 | Migration 00027 gap investigation | CLOSED | main (investigation) |
| PT-012 | Zod schema duplication documented | DONE | main (inline) |

## Test Suite (final state of sprint)

```
@micro-store/client-hub   → 12 tests  (3 files)
@micro-store/core          → 26 tests  (4 files)
@micro-store/edge-functions-tests → 76 tests  (9 files)
                        TOTAL: 114 tests, all GREEN
```

## Next Actions

- Human validation for PT-004 and PT-005 (see HANDOFF.md)
- Run `/graphify . --update` to refresh knowledge graph
- Run `[START FPGE]` for next roadmap cycle
