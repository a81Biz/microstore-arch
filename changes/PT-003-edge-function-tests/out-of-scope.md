# Out of Scope — PT-003 (Phase 1)

- Tests for manage-addresses, change-password, confirm-totp, verify-totp (Phase 2)
- Tests for payment-webhook (Phase 3 — requires idempotency key logic)
- Tests for send-*-email functions (email template functions)
- Integration tests requiring live Supabase DB (PE-001 dependency)
- Modifying any Edge Function implementation code
- Adding new test infrastructure or vitest configuration
- Tests for health, main, trigger-rebuild (low business risk)
