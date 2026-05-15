# Tareas Pendientes — Micro-Store Arch

**Corte:** 2026-05-15 04:30 AM  
**Estado general del proyecto:** Sprints 0-5 completos · Segunda auditoría remediada · En preparación para producción

---

## PRIORIDAD ALTA — Seguridad / Correctness

### ~~PT-001 · Verificar integridad de `verify-totp` reescrito~~ ✅ COMPLETADO 2026-05-15
- Backdoor confirmado eliminado. 4 tests de seguridad añadidos. 28/28 pasan.
- `otpauth ^9.3.6` añadido a `packages/core` devDependencies.

### ~~PT-002 · Rate limit fail-closed en `login`~~ ✅ COMPLETADO 2026-05-15
- `checkRateLimit` en BaseController ahora lanza BusinessError 429 en error de BD.
- `checkLoginRateLimit` en login separada en 2 ramas: BD error → 429, data false → 429.
- Catch block de login añade `Retry-After: 300` a toda respuesta 429.
- Ventana mantenida en 300s; ajustar a 60s si se prefiere ventana más corta.

### ~~PT-003 · CORS: reemplazar `*` por lista blanca de dominios~~ ✅ COMPLETADO 2026-05-15
- `getCorsOrigin()` en `base-controller.ts` ya implementada: lee `ALLOWED_ORIGINS` del env,
  valida origen, no usa `'*'`. `.env.example` ya tiene los 3 dominios de dev.
- Validación Graphify C29: llamadas internas (service_role) no pasan por CORS — sin impacto.

---

## PRIORIDAD MEDIA — Producción / Deploy

### ~~PT-004 · Completar `wrangler.toml` con IDs reales de Cloudflare Pages~~ ✅ COMPLETADO 2026-05-15
- Estructura completa en los 3 archivos: `compatibility_flags`, `pages_build_output_dir`, `[env.preview]`.
- Nombres corregidos: `micro-store-client`, `micro-store-admin`.
- **Acción pendiente (usuario):** Reemplazar `PRODUCTION_ACCOUNT_ID_HERE` y `PRODUCTION_ZONE_ID_HERE`
  con los valores reales del [Cloudflare Dashboard](https://dash.cloudflare.com).

### ~~PT-005 · Crear `docs/HANDOFF.md`~~ ✅ COMPLETADO 2026-05-15
- Creado con 8 secciones: Estado · Stack · Graphify BaseController analysis · Protocolo break-glass
  · Infraestructura CF Pages + env vars · Accesos · Próximos pasos · Comandos de referencia.

### PT-006 · Configurar variables de entorno de producción en Supabase
- **Contexto:** `ENCRYPTION_KEY`, `RESEND_API_KEY`, `LOGFLARE_API_KEY` y secretos de pasarelas
  no están configurados en el proyecto Supabase de producción (solo en `.env` local).
- **Archivos:** No es un cambio de código — es operación en Supabase Dashboard / `supabase secrets set`.
- **Acción manual:** El usuario ejecuta `supabase secrets set --env-file .env.production` una vez
  que `.env.production` esté completo.

### ~~PT-007 · E2E checkout-flow: completar casos de fallo~~ ✅ COMPLETADO 2026-05-15
- 4/4 tests pasan: flujo completo Stripe · pago rechazado · stock insuficiente · no autenticado.
- Corregido: tests anteriores no mockeaban `supabaseClient.auth.getSession` → fallo silencioso.
- Cada caso verifica el mensaje de UI exacto que recibirá el usuario.

---

## PRIORIDAD BAJA — Calidad / DevEx

### ~~PT-008 · Smoke test de producción al ejecutar deploy~~ ✅ COMPLETADO 2026-05-15
- `scripts/test/smoke-test.sh` creado: verifica HTTP 200 en los 3 frontends + API health; exit 1 en fallo.
- `deploy.yml` añade paso "Smoke Test" tras Health Check con los 4 secrets de URL.
- Bonus: corregidos project names en deploy.yml (alineados con PT-004).

### PT-009 · Actualizar graphify tras cada sprint / sesión
- **Contexto:** El grafo de conocimiento (`graphify-out/`) debe mantenerse actualizado para que
  las consultas sean precisas. Protocolo: ejecutar `/graphify . --update` al inicio de cada sesión.
- **Acción:** Hábito operativo, no cambio de código. Ya realizado el 2026-05-15.

### ~~PT-010 · Documentar variable `PAYPAL_ENV` en `.env.example`~~ ✅ COMPLETADO (previo)
- `.env.example` línea 35 ya contiene `PAYPAL_ENV=sandbox` con comentario. Confirmado durante PT-003.

---

## Completadas esta sesión (2026-05-15)

- [x] CLAUDE.md actualizado con Protocolo de Cuota, Segmentación y Persistencia.
- [x] Grafo graphify actualizado: 935 nodos, 1258 aristas, 88 comunidades.
- [x] Carpeta `docs/implementation/` creada con PLAN_ACTUAL.md, PENDING_TASKS.md, HISTORY.log.
