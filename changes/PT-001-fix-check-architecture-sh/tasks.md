# Tasks — PT-001: Fix check-architecture.sh

## PT-001.1 — Add missing email function exclusions to Rule 1

**Objective:** Add `--exclude-dir` flags for `send-delivery-email` and `send-status-email` to the Rule 1 grep.  
**Inputs:** `src/scripts/check-architecture.sh` lines 36–47  
**Outputs:** Rule 1 grep excludes all 4 email template functions  
**Validation:** `grep "send-delivery-email" src/scripts/check-architecture.sh` returns a match  
**Status:** PENDING

---

## PT-001.2 — Add .astro cache directory exclusion to Rule 2

**Objective:** Add `--exclude-dir=".astro"` to the Rule 2 inline styles grep.  
**Inputs:** `src/scripts/check-architecture.sh` lines 57–62  
**Outputs:** Rule 2 grep excludes Astro internal cache directory  
**Validation:** `grep "exclude-dir.*\.astro" src/scripts/check-architecture.sh` returns a match  
**Status:** PENDING

---

## PT-001.3 — Run script and verify EXIT 0

**Objective:** Confirm the script exits 0 with no false positives on the current clean codebase.  
**Inputs:** Modified `check-architecture.sh`, current repo state  
**Outputs:** Script output showing all 5 rules ✅, EXIT 0  
**Validation:** `bash src/scripts/check-architecture.sh; echo "EXIT $?"` → "EXIT 0"  
**Status:** PENDING

---

## PT-001.4 — Regression test: verify real violations still caught

**Objective:** Confirm the fix did not introduce blind spots.  
**Inputs:** Temporary test file with deliberate violations  
**Outputs:** Script catches the violations (EXIT 1), then test file removed  
**Validation:**
1. Add `<div>test</div>` to a non-email .ts file → check EXIT 1 for Rule 1 ✅
2. Add `style="color:red"` to a .astro file → check EXIT 1 for Rule 2 ✅
3. Remove test content  
**Status:** PENDING
