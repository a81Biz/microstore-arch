# PT-020 — Evidence & Self-Review

**Date:** 2026-06-25
**Branch:** feature/PT-020-audit-ci-gate

## Change

Added one step to `.github/workflows/ci.yml` after `Install dependencies`:

```yaml
- name: Security Audit
  run: npm audit --audit-level=high
```

## Verification

- Gate confirmed functional: running `npm audit --audit-level=high` on `main` (astro@5) returns
  exit 1 with 7 HIGH CVEs → proves gate would block a merge with vulnerabilities.
- After PT-014 merges (astro@7, 0 vulnerabilities), the same command returns exit 0.
- No other files modified. No source code changes. No test regressions.

## Merge Order

**PT-020 must be merged after PT-014.** PT-014 resolves the 7 HIGH CVEs.
Merge sequence: `feature/PT-023-ef-phase2-tests` → `fix/PT-014-astro7-upgrade` → `feature/PT-020-audit-ci-gate`

## Self-Review Checklist

- [x] Acceptance criteria: CI fails on HIGH CVE → verified locally (exit 1 on astro@5)
- [x] No unintended side effects
- [x] Commit atomic and named: `feat: PT-020 — add npm audit --audit-level=high gate to CI`
- [x] No debug artifacts
- [x] TRIVIAL path: no Proposal Package required
