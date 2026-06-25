# design.md — PT-023: Edge Function Test Coverage Phase 2

**PT:** PT-023 · **Roadmap:** R-020 · **Estado:** STATE 3 (Proposal Package)  
**Fecha:** 2026-06-25

---

## Decisiones de Arquitectura

### D-1: Contract Testing via `global.fetch` mock

**Decisión:** Seguir el patrón establecido en PT-003 (`login/__tests__/`, `manage-cart/__tests__/`): mockear `global.fetch` para simular respuestas HTTP, verificar el contrato request/response.

**Rationale:** Las Edge Functions corren en Deno. Importarlas directamente en Vitest (Node.js) requiere shims de Deno incompatibles con el setup actual. El patrón `global.fetch = vi.fn().mockResolvedValue(...)` ya funciona, es conocido por el equipo, y verifica el contrato HTTP sin dependencias de runtime.

**Alternativas rechazadas:**
- Import directo del handler → incompatible con Vitest+Node, requeriría `deno test` y cambios de config
- Integration tests via HTTP → scope de PT-015 (requiere Supabase live)

**Implicación:** Los tests no verifican lógica interna — verifican el contrato de request/response. Si una refactoring interna no cambia el contrato HTTP, los tests siguen pasando. Esto es una característica, no un defecto.

---

### D-2: Una función por archivo de tests

**Decisión:** Crear un archivo `.test.ts` por función objetivo bajo su directorio `__tests__/`.

```
src/supabase/functions/manage-payment-gateways/__tests__/manage-payment-gateways.test.ts
src/supabase/functions/manage-addresses/__tests__/manage-addresses.test.ts
src/supabase/functions/change-password/__tests__/change-password.test.ts
```

**Rationale:** Aislamiento de failures, consistente con el patrón del proyecto.

---

### D-3: Hallazgos importantes de la lectura de código (STATE 2)

Estos hallazgos corrigen los test scenarios del ENRICHMENT.md inicial y deben reflejarse en los tests:

**`manage-payment-gateways`:**
- POST retorna **200** (no 201) — `{ success: true, gateway }`
- Auth: `requireAdminMFA` (vendor role + MFA verificado en JWT)
- Ruta pública sin auth: `GET /public` → array de gateways enabled
- Ruta protegida: `GET` → array de todos los gateways (enabled e disabled) con metadatos

**`manage-addresses`:**
- Usa `customer_addresses` como nombre de tabla (no `addresses`)
- DELETE retorna **200** con `{ success: true }` (no 204)
- Auth: `authenticateUser` (cualquier usuario autenticado, no solo vendor)
- `assertOwnership` lanza NOT_FOUND (404), no Forbidden (403)

**`change-password`:**
- Toma `{ temp_token, new_password }` (no `{ current_password, new_password }`)
- **Es un flujo de primer login** — el `temp_token` viene del login flow cuando `password_changed_at IS NULL`
- Validación de complejidad: ≥12 chars, mayúscula, minúscula, número, carácter especial → error `WEAK_PASSWORD` (400)
- Token inválido → `UnauthorizedError` (401) desde `supabaseAdmin.auth.getUser(temp_token)`
- Body vacío (sin temp_token) → 401 `Token y nueva contraseña requeridos`
- Usa `serve()` directamente (NO BaseController)
