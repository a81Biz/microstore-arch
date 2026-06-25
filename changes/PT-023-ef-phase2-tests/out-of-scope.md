# out-of-scope.md — PT-023: Edge Function Test Coverage Phase 2

**PT:** PT-023 · **Fecha:** 2026-06-25

---

## Exclusiones Explícitas

### Funciones Edge fuera de scope

| Función | Razón | Defer a |
|:--|:--|:--|
| `send-order-email` | Requiere mock de SMTP/Resend — superficie diferente | PT futuro |
| `send-shipping-email` | Ídem | PT futuro |
| `send-delivery-email` | Ídem | PT futuro |
| `send-status-email` | Ídem | PT futuro |
| `trigger-rebuild` | Webhook simple, sin lógica de negocio | No planificado |
| `capture-paypal-order` | PayPal API surface compleja | PT futuro |
| `health` endpoint | Trivial, sin lógica de negocio | No planificado |

### Tipos de tests fuera de scope

| Tipo | Razón | Defer a |
|:--|:--|:--|
| Integration tests con Supabase real | PT-015 scope | PT-015 |
| Frontend test coverage | PT-017 scope | PT-017 |
| Tests de complejidad de contraseña (unit en `validatePasswordComplexity`) | No es function contract; es lógica interna | Fuera de scope |
| Tests de la ruta `PUT /manage-addresses/:id` y `PATCH .../default` | Suficiente cobertura con los 4 scenarios definidos | Extensión futura |

### Cambios de código fuera de scope

| Cambio | Razón |
|:--|:--|
| Refactoring de funciones para hacerlas más testeable | No es el objetivo de esta PT |
| Añadir exports de handlers internos | Fuera del pattern del proyecto |
| Cambiar estructura de respuestas HTTP | Breaking change; no autorizado por esta PT |
| Añadir coverage reports numéricos a CI | Fuera de scope; sin umbrales definidos en el proyecto |
