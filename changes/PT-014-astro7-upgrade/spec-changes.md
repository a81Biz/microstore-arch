# spec-changes.md — PT-014: astro@5→7 upgrade

**PT:** PT-014 · **Fecha:** 2026-06-25

---

## Cambios de Especificación Requeridos

### SC-1: Node.js mínimo requerido

**Artefacto:** `package.json` (root)  
**Cambio:**
```json
// Antes
"engines": { "node": ">=22.0.0" }

// Después
"engines": { "node": ">=22.12.0" }
```
**Razón:** Astro v6 elevó el mínimo de Node de 18/20 a 22.12.0. Sin esta actualización, la spec declarada sería inconsistente con el runtime requerido.

**Impacto:** CI usa Node 22 LTS (≥22.12.0 actualmente) — sin cambio en comportamiento real del pipeline. Solo corrección de spec declarada.

---

## Documentación Enterprise a Actualizar Post-Implementación

Los siguientes documentos en `docs/enterprise-documentation/` reflejarán el upgrade post-cierre de PT-014:

| Doc | Sección | Actualización requerida |
|:--|:--|:--|
| `03-TRD.md` | Stack técnico | `astro@5` → `astro@7` |
| `11-Conventions.md` | Stack / versiones | Si menciona versión de astro |

**Nota:** La actualización de docs enterprise puede hacerse como parte de STATE 7 (HISTORY.log + HANDOFF.md) sin generar un PT separado dado que es consecuencia directa de este upgrade.

---

## Sin cambios en

- API pública de los apps (rutas, endpoints)
- Contratos de Edge Functions (ninguna Edge Function es afectada)
- Schema de BD (ninguna migración)
- Variables de entorno requeridas
- Configuración de CI/CD (ci.yml, deploy.yml) — el pipeline sigue igual salvo que Node 22.12.0 ya cumple el nuevo requisito
