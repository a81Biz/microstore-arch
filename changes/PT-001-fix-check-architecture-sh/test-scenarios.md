# Test Scenarios — PT-001

## TS-001.1 — Clean codebase exits 0
**When:** Repository is in clean state (no real violations)  
**Then:** `bash src/scripts/check-architecture.sh` exits 0, all 5 rules show ✅

## TS-001.2 — HTML in non-email .ts still caught
**When:** A fake HTML tag `<div>test</div>` is added to `src/supabase/functions/manage-orders/index.ts`  
**Then:** Script exits 1 with Rule 1 violation  
**After:** Test content reverted

## TS-001.3 — HTML in email template not caught (exclusion works)
**When:** `send-delivery-email/index.ts` contains `<table>` tags  
**Then:** Script does NOT flag it (Rule 1 passes)

## TS-001.4 — Inline style in .astro still caught
**When:** A fake `style="color:red"` is added to any .astro file in src/apps/  
**Then:** Script exits 1 with Rule 2 violation  
**After:** Test content reverted

## TS-001.5 — .astro/ cache does not cause false positive
**When:** `.astro/` cache directories exist inside src/apps/  
**Then:** Script does NOT flag inline styles in cache files
