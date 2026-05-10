# Micro-Store Arch - Runbook de Operaciones

## Información del Sistema

- **Stack:** Astro + Supabase + Cloudflare Pages
- **URLs:**
  - Storefront: https://tienda.com
  - Client Hub: https://cliente.tienda.com
  - Vendor Admin: https://admin.tienda.com
- **Dashboard Supabase:** https://supabase.com/dashboard/project/your-project
- **Dashboard Cloudflare:** https://dash.cloudflare.com

## Contactos de Emergencia

- **Arquitecto:** Alberto Jacinto Martínez Torres
- **Desarrollador Backend:** [Nombre] - [Teléfono]
- **Desarrollador Frontend:** [Nombre] - [Teléfono]

## Procedimientos

### 1. Despliegue de Emergencia

```bash
git pull origin main
npm ci
bash scripts/deploy/deploy-all.sh
```

### 2. Rollback

```bash
# Revertir a versión anterior
git revert HEAD --no-edit
git push origin main

# Re-desplegar
bash scripts/deploy/deploy-all.sh
```

### 3. Restaurar Base de Datos

```bash
# 1. Localizar backup más reciente
ls -la backups/production/

# 2. Restaurar
gunzip -c backups/production/prod_backup_20260501_120000.sql.gz | \
  psql "$SUPABASE_DB_URL"

# 3. Verificar
supabase db test
```

### 4. Monitoreo y Alertas

- **Logflare:** https://logflare.app (logs en tiempo real)
- **Health Check:** `GET /functions/v1/health`
- **Uptime:** Monitoreado por Cloudflare Health Checks

## Mantenimiento Periódico

- **Diario:** Revisar logs de errores en Logflare.
- **Semanal:** Verificar integridad de los backups automáticos.
- **Mensual:** Rotar llaves de acceso de pasarelas si es necesario.
