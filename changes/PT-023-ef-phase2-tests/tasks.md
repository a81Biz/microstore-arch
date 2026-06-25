# tasks.md — PT-023: Edge Function Test Coverage Phase 2

**PT:** PT-023 · **Estado:** STATE 3  
**Fecha:** 2026-06-25

---

## Tareas Atómicas

### PT-023.1 — Tests RED: `manage-payment-gateways`

**Objetivo:** Crear archivo de tests con escenarios que fallen (RED) antes de verificar que los mocks resuelven correctamente al verde.

**Inputs:**
- `src/supabase/functions/manage-payment-gateways/index.ts` (leído en STATE 2)
- Patrón de tests: `login/__tests__/login.test.ts`
- Escenarios: ver `test-scenarios.md` §1

**Outputs:**
- `src/supabase/functions/manage-payment-gateways/__tests__/manage-payment-gateways.test.ts` (nuevo)
- Suite: ≥3 tests pasando GREEN

**Validación:** `npm run test --workspaces --if-present` → manage-payment-gateways tests GREEN, resto sin regresión.

**Status:** DONE ✅

---

### PT-023.2 — Tests RED→GREEN: `manage-addresses`

**Objetivo:** Crear tests para manage-addresses cubriendo create, list y auth guard.

**Inputs:**
- `src/supabase/functions/manage-addresses/index.ts` (leído en STATE 2)
- Escenarios: ver `test-scenarios.md` §2

**Outputs:**
- `src/supabase/functions/manage-addresses/__tests__/manage-addresses.test.ts` (nuevo)
- Suite: ≥3 tests pasando GREEN

**Validación:** Suite completa pasa sin regresión.

**Status:** DONE ✅

---

### PT-023.3 — Tests RED→GREEN: `change-password`

**Objetivo:** Crear tests para change-password cubriendo happy path, token inválido y contraseña débil.

**Inputs:**
- `src/supabase/functions/change-password/index.ts` (leído en STATE 2)
- Nota crítica: toma `{temp_token, new_password}` — flujo primer login, no current_password
- Escenarios: ver `test-scenarios.md` §3

**Outputs:**
- `src/supabase/functions/change-password/__tests__/change-password.test.ts` (nuevo)
- Suite: ≥3 tests pasando GREEN

**Validación:** Suite completa pasa sin regresión.

**Status:** DONE ✅

---

### PT-023.4 — Verificación Final GREEN

**Objetivo:** Confirmar que la suite completa pasa y el total ≥ 123 tests.

**Inputs:** 3 archivos de tests creados en PT-023.1/2/3

**Outputs:**
- `npm run test --workspaces --if-present` → EXIT 0
- Línea de output confirmando total ≥ 123 tests, 0 failures

**Validación:** Captura de output como evidencia (evidence/PT-023/).

**Status:** DONE ✅

---

## Resumen de Archivos Nuevos

| Archivo | Tipo | Acción |
|:--|:--|:--|
| `src/supabase/functions/manage-payment-gateways/__tests__/manage-payment-gateways.test.ts` | Test | CREAR |
| `src/supabase/functions/manage-addresses/__tests__/manage-addresses.test.ts` | Test | CREAR |
| `src/supabase/functions/change-password/__tests__/change-password.test.ts` | Test | CREAR |

**Archivos a modificar:** Ninguno (additive only).

## Notas de Implementación

- No modificar código fuente de las funciones
- No modificar vitest.config.ts (glob ya cubre `**/__tests__/**/*.test.ts`)
- Cada test file: `import { describe, it, expect, vi } from 'vitest'`
- `beforeEach(() => vi.restoreAllMocks())` para evitar state entre tests
