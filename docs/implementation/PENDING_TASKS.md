# Tareas Pendientes — Micro-Store Arch

**Corte:** 2026-05-16 (sesión 16 · PT-BUG-037 completada — bugs B1/B2/B3 + features F1/F2 cerrados)
**Estado general del proyecto:** Sprints 0-5 completos · PT-001–PT-037 cerradas

---

## PRIORIDAD MEDIA — Producción / Operativas (abiertas)

### PT-006 · Configurar variables de entorno de producción en Supabase
- **Contexto:** `ENCRYPTION_KEY`, `RESEND_API_KEY`, `LOGFLARE_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y secretos de pasarelas no están configurados en el proyecto Supabase de producción (solo en `.env` local).
- **Acción manual:** `supabase secrets set --env-file .env.production` una vez que `.env.production` esté completo.

### PT-009 · Actualizar graphify tras cada sprint / sesión
- **Acción:** Ejecutar `/graphify . --update` al inicio de cada sesión. Hábito operativo — no es cambio de código.
