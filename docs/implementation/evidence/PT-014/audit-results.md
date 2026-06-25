# PT-014 — Evidence: npm audit Results

**Date:** 2026-06-25
**Branch:** fix/PT-014-astro7-upgrade
**Command:** `npm audit --audit-level=high`

## Result: 0 VULNERABILITIES ✅

```
vulnerabilities: {'info': 0, 'low': 0, 'moderate': 0, 'high': 0, 'critical': 0, 'total': 0}
```

## CVEs Closed by This PT

### via astro@7.0.2 (5 HIGH CVEs)
| CVE ID | Package | Status |
|--------|---------|--------|
| GHSA-j687-* | astro | ✅ CLOSED |
| GHSA-xr5h-* | astro | ✅ CLOSED |
| GHSA-8hv8-* | astro | ✅ CLOSED |
| GHSA-jrpj-* | astro | ✅ CLOSED |
| GHSA-2pvr-* | astro | ✅ CLOSED |

### via `npm audit fix` (2 HIGH CVEs)
| CVE ID | Package | Status |
|--------|---------|--------|
| GHSA-v6wh-* | vite | ✅ CLOSED |
| GHSA-fx2h-* | vite | ✅ CLOSED |

## PTSA Finding Closed
H-013 (D2 — 2 HIGH CVEs in astro/vite) → can be set to CERRADA after this PT merges.
Expected D2 impact: D2 = 100 (no remaining active HIGH/CRITICAL findings).
