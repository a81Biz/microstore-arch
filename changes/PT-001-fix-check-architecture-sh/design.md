# Design — PT-001: Fix check-architecture.sh False Positives

**PT:** PT-001 | **Type:** BUG STANDARD | **Date:** 2026-06-24

---

## Root Cause (from DISCOVERY.md)

`src/scripts/check-architecture.sh` has two false-positive sources:

**Rule 1** (no HTML in .ts): The grep already excludes `send-order-email` and `send-shipping-email`, but two additional email template functions were added later without updating the exclusion list:
- `send-delivery-email/index.ts` — generates HTML delivery notification email
- `send-status-email/index.ts` — generates HTML status update email

**Rule 2** (no inline styles in .astro): The grep searches `src/apps/ --include="*.astro"` without excluding `.astro/` cache directories. Astro's dev server generates type declaration files inside `src/apps/*/.astro/` which may contain compiled `.astro` fragments with inline styles from SSR optimization.

## Architecture Decision

**Approach: Minimal targeted exclusions in the grep patterns.**

Two-line change to the existing shell script:
1. Add `--exclude-dir="send-delivery-email" --exclude-dir="send-status-email"` to Rule 1 grep (lines 36–47).
2. Add `--exclude-dir=".astro"` to Rule 2 grep (lines 57–62).

**Why not a broader approach:**
- Rewriting the script in TypeScript/Node: out of scope, adds build dependency.
- Adding a comment-based ignore pragma (`# check:skip`): introduces non-standard convention not documented anywhere.
- Excluding all email functions with a glob: `.astro/` exclusion is independent and the email list is small and explicit.

**Why explicit directory exclusions are safe:**
- Email template functions are already excluded by precedent (2 of 4 were excluded). Adding the remaining 2 is consistent.
- `.astro/` is Astro's internal cache directory — never contains user-authored source code.
- The core rule (no HTML in real business logic .ts files) is not weakened.

## Verification Strategy

After fix:
1. `bash src/scripts/check-architecture.sh` → EXIT 0 (primary criterion)
2. Deliberately add `<div>test</div>` to a non-email .ts file → script catches it (regression)
3. Deliberately add `style="color:red"` to a .astro file → script catches it (regression)
