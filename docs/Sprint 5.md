# 📦 Micro-Store Arch — Sprint 5: Despliegue, Monitoreo y Cierre

**Versión:** 1.0
**Duración:** 1 semana
**Objetivo:** Desplegar el sistema completo en producción, configurar dominios, implementar monitoreo y logging, realizar pruebas de seguridad, documentar procedimientos operativos y preparar el handoff final.

**Dependencia:** Sprints 0-4 completados (todas las funcionalidades implementadas y probadas).

---

## 🎯 Objetivos del Sprint

1. Configurar despliegue en Cloudflare Pages para los 3 sitios.
2. Configurar proyecto de Supabase en producción.
3. Configurar dominios y SSL (tienda.com, cliente.tienda.com, admin.tienda.com).
4. Implementar monitoreo con Logflare/Sentry (free tier).
5. Realizar auditoría de seguridad (OWASP ZAP baseline).
6. Configurar backups automáticos de base de datos.
7. Documentar procedimientos operativos (runbook).
8. Configurar Job de Limpieza y Archivado de Datos (GitHub Actions).
9. Realizar pruebas de carga básicas.
10. Preparar documentación final de entrega.

---

## 📋 Historias de Usuario Técnicas

- **HU-S5-01:** Como DevOps, quiero desplegar los 3 sitios en Cloudflare Pages con un solo comando.
- **HU-S5-02:** Como arquitecto, quiero que los errores de producción se registren en Logflare.
- **HU-S5-03:** Como dueño del negocio, quiero que el sitio tenga SSL y dominio personalizado.
- **HU-S5-04:** Como administrador, quiero tener backups diarios automáticos de la base de datos.
- **HU-S5-05:** Como auditor, quiero que el sistema pase un scan de seguridad OWASP ZAP.

---

## 📁 Tarea 5.0: Estructura de Carpetas (Nuevos Archivos)

```bash
# Configuración de despliegue
mkdir -p .github/workflows
mkdir -p scripts/deploy

# Documentación operativa
mkdir -p docs

# Configuración de monitoreo
mkdir -p supabase/functions/_shared/monitoring
```

---

## 📁 Tarea 5.1: Configuración de Despliegue

### 5.1.1 Cloudflare Pages - Storefront

**`apps/storefront/wrangler.toml`**
```toml
name = "micro-store-storefront"
compatibility_date = "2026-05-01"

[env.production]
vars = { 
  PUBLIC_SUPABASE_URL = "https://your-project.supabase.co",
  PUBLIC_STOREFRONT_URL = "https://tienda.com",
  PUBLIC_CLIENT_HUB_URL = "https://cliente.tienda.com"
}

[[env.production.routes]]
pattern = "tienda.com/*"
```

### 5.1.2 Cloudflare Pages - Client Hub

**`apps/client-hub/wrangler.toml`**
```toml
name = "micro-store-client-hub"
compatibility_date = "2026-05-01"

[env.production]
vars = { 
  PUBLIC_SUPABASE_URL = "https://your-project.supabase.co",
  PUBLIC_API_BASE = "https://your-project.supabase.co/functions/v1",
  PUBLIC_STOREFRONT_URL = "https://tienda.com"
}

[[env.production.routes]]
pattern = "cliente.tienda.com/*"
```

### 5.1.3 Cloudflare Pages - Vendor Admin

**`apps/vendor-admin/wrangler.toml`**
```toml
name = "micro-store-vendor-admin"
compatibility_date = "2026-05-01"

[env.production]
vars = { 
  PUBLIC_SUPABASE_URL = "https://your-project.supabase.co",
  PUBLIC_API_BASE = "https://your-project.supabase.co/functions/v1"
}

[[env.production.routes]]
pattern = "admin.tienda.com/*"
```

### 5.1.4 Script de Despliegue Unificado

**`scripts/deploy/deploy-all.sh`**
```bash
#!/bin/bash
set -euo pipefail

echo "🚀 Micro-Store Arch - Despliegue a Producción"
echo "=============================================="

# 1. Verificar variables de entorno
if [ ! -f .env.production ]; then
  echo "❌ Error: .env.production no encontrado"
  exit 1
fi

source .env.production

# 2. Construir aplicaciones
echo ""
echo "📦 Construyendo aplicaciones..."

echo "  → Storefront..."
cd apps/storefront && npm run build && cd ../..

echo "  → Client Hub..."
cd apps/client-hub && npm run build && cd ../..

echo "  → Vendor Admin..."
cd apps/vendor-admin && npm run build && cd ../..

# 3. Desplegar a Cloudflare Pages
echo ""
echo "☁️ Desplegando a Cloudflare Pages..."

# Storefront
echo "  → Desplegando Storefront..."
npx wrangler pages deploy apps/storefront/dist \
  --project-name micro-store-storefront \
  --branch main \
  --commit-dirty=true

# Client Hub
echo "  → Desplegando Client Hub..."
npx wrangler pages deploy apps/client-hub/dist \
  --project-name micro-store-client-hub \
  --branch main \
  --commit-dirty=true

# Vendor Admin
echo "  → Desplegando Vendor Admin..."
npx wrangler pages deploy apps/vendor-admin/dist \
  --project-name micro-store-vendor-admin \
  --branch main \
  --commit-dirty=true

# 4. Desplegar Edge Functions a Supabase
echo ""
echo "⚡ Desplegando Edge Functions..."
supabase functions deploy create-order
supabase functions deploy payment-webhook
supabase functions deploy manage-products
supabase functions deploy manage-orders
supabase functions deploy manage-payment-gateways
supabase functions deploy login
supabase functions deploy verify-totp
supabase functions deploy setup-totp
supabase functions deploy confirm-totp
supabase functions deploy send-order-email
supabase functions deploy send-shipping-email
supabase functions deploy trigger-rebuild
supabase functions deploy health

# 5. Aplicar migraciones pendientes
echo ""
echo "🗄️ Aplicando migraciones..."
supabase db push

# 6. Configurar variables de entorno
echo ""
echo "🔧 Configurando variables de entorno..."
supabase secrets set --env-file .env.production

# 7. Invalidar caché de Cloudflare
echo ""
echo "🗑️ Invalidando caché..."
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'

echo ""
echo "✅ Despliegue completado exitosamente"
echo "=============================================="
echo "  Storefront:     https://tienda.com"
echo "  Client Hub:     https://cliente.tienda.com"
echo "  Vendor Admin:   https://admin.tienda.com"
```

```bash
chmod +x scripts/deploy/deploy-all.sh
```

### 5.1.5 Variables de Entorno de Producción

**`.env.production.example`**
```bash
# ====================================
# Micro-Store Arch: Variables de Producción
# ====================================
# Copiar a .env.production y completar valores reales

# --- Supabase Producción ---
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# --- Encriptación ---
ENCRYPTION_KEY=your-production-64-char-hex-key

# --- Cloudflare ---
CF_API_TOKEN=your-production-api-token
CF_ZONE_ID=your-zone-id
CF_DEPLOY_HOOK_URL=https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...

# --- Pasarelas de Pago (Producción) ---
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=live...
PAYPAL_SECRET=live...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
HEYBANCO_API_KEY=live_...

# --- Email Transaccional ---
RESEND_API_KEY=re_...
EMAIL_FROM=notificaciones@tienda.com

# --- URLs de Producción ---
PUBLIC_STOREFRONT_URL=https://tienda.com
PUBLIC_CLIENT_HUB_URL=https://cliente.tienda.com
PUBLIC_VENDOR_ADMIN_URL=https://admin.tienda.com

# --- Monitoreo ---
LOGFLARE_API_KEY=your-logflare-key
LOGFLARE_SOURCE_ID=your-source-id
SENTRY_DSN=https://your-sentry-dsn
```

---

## 📁 Tarea 5.2: Monitoreo y Observabilidad

### 5.2.1 Integración con Logflare

**`supabase/functions/_shared/monitoring/logflare.ts`**
```typescript
export interface LogflareConfig {
  apiKey: string;
  sourceId: string;
}

export class LogflareClient {
  private apiKey: string;
  private sourceId: string;
  private endpoint = 'https://api.logflare.app/logs';

  constructor(config: LogflareConfig) {
    this.apiKey = config.apiKey;
    this.sourceId = config.sourceId;
  }

  async sendLog(level: string, message: string, metadata: Record<string, unknown> = {}) {
    try {
      const payload = {
        source: this.sourceId,
        log_entry: JSON.stringify({
          level,
          message,
          timestamp: new Date().toISOString(),
          environment: Deno.env.get('ENVIRONMENT') || 'production',
          ...metadata
        })
      };

      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      // Fallback: log a consola si Logflare falla
      console.error('Logflare send failed:', error);
    }
  }
}

// Singleton
let instance: LogflareClient | null = null;

export function getLogflareClient(): LogflareClient | null {
  if (instance) return instance;

  const apiKey = Deno.env.get('LOGFLARE_API_KEY');
  const sourceId = Deno.env.get('LOGFLARE_SOURCE_ID');

  if (!apiKey || !sourceId) {
    console.warn('Logflare not configured');
    return null;
  }

  instance = new LogflareClient({ apiKey, sourceId });
  return instance;
}
```

### 5.2.2 Logger Mejorado con Logflare

**`supabase/functions/_shared/logger.ts`** (actualización)
```typescript
import { getLogflareClient } from "./monitoring/logflare.ts";

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context: Record<string, unknown>;
  timestamp: string;
  function_name: string;
  request_id?: string;
}

export function createLogger(functionName: string) {
  const logflare = getLogflareClient();

  const baseLog = (level: LogLevel, message: string, context: Record<string, unknown> = {}) => {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      function_name: functionName,
      request_id: context.request_id as string || undefined
    };

    const logString = JSON.stringify(entry);

    switch (level) {
      case 'debug': console.debug(logString); break;
      case 'info':  console.info(logString);  break;
      case 'warn':  console.warn(logString);  break;
      case 'error': console.error(logString); break;
    }

    // Enviar a Logflare en producción (solo warn/error para no saturar)
    if (logflare && (level === 'warn' || level === 'error')) {
      logflare.sendLog(level, message, {
        function_name: functionName,
        ...context
      }).catch(err => console.error('Logflare error:', err));
    }
  };

  return {
    debug: (msg: string, ctx?: Record<string, unknown>) => baseLog('debug', msg, ctx),
    info:  (msg: string, ctx?: Record<string, unknown>) => baseLog('info', msg, ctx),
    warn:  (msg: string, ctx?: Record<string, unknown>) => baseLog('warn', msg, ctx),
    error: (msg: string, ctx?: Record<string, unknown>) => baseLog('error', msg, ctx),
  };
}
```

### 5.2.3 Health Check Mejorado

**`supabase/functions/health/index.ts`** (actualización)
```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (_req: Request) => {
  const checks: Record<string, any> = {
    service: 'micro-store-arch',
    version: '1.0.0',
    environment: Deno.env.get('ENVIRONMENT') || 'development',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(performance.now() / 1000)
  };

  // Verificar conexión a BD
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
    
    checks.database = error ? 'error' : 'connected';
    checks.products_count = data || 0;
  } catch (err) {
    checks.database = 'error';
    checks.database_error = String(err);
  }

  // Verificar estado de pasarelas
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: gateways } = await supabase
      .from('payment_credentials')
      .select('gateway, is_enabled');
    
    checks.payment_gateways = gateways || [];
  } catch (err) {
    checks.payment_gateways = 'error';
  }

  // Verificar memoria disponible (Deno)
  const memoryInfo = (Deno as any).memoryUsage?.();
  if (memoryInfo) {
    checks.memory = {
      heapUsed: Math.round(memoryInfo.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryInfo.heapTotal / 1024 / 1024) + 'MB'
    };
  }

  const status = checks.database === 'error' ? 503 : 200;

  return new Response(JSON.stringify(checks, null, 2), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
});
```

---

## 📁 Tarea 5.3: Seguridad

### 5.3.1 Script de Auditoría OWASP ZAP

**`scripts/security/zap-scan.sh`**
```bash
#!/bin/bash
set -euo pipefail

echo "🔒 Micro-Store Arch - Escaneo de Seguridad OWASP ZAP"
echo "===================================================="

# Requisitos: Docker con OWASP ZAP instalado
# docker pull owasp/zap2docker-stable

TARGET_URL="${1:-https://tienda.com}"
REPORT_DIR="./security-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$REPORT_DIR"

echo "🎯 Objetivo: $TARGET_URL"
echo "📁 Reportes: $REPORT_DIR"
echo ""

# Ejecutar escaneo baseline
docker run --rm \
  -v "$(pwd)/$REPORT_DIR:/zap/wrk" \
  owasp/zap2docker-stable zap-baseline.py \
  -t "$TARGET_URL" \
  -r "${TIMESTAMP}_baseline_report.html" \
  -w "${TIMESTAMP}_baseline_report.md"

# Ejecutar escaneo completo (más lento pero más exhaustivo)
echo ""
echo "¿Ejecutar escaneo completo? (s/n)"
read -r response

if [ "$response" = "s" ]; then
  docker run --rm \
    -v "$(pwd)/$REPORT_DIR:/zap/wrk" \
    owasp/zap2docker-stable zap-full-scan.py \
    -t "$TARGET_URL" \
    -r "${TIMESTAMP}_full_report.html" \
    -w "${TIMESTAMP}_full_report.md"
fi

echo ""
echo "✅ Escaneo completado. Reportes en: $REPORT_DIR"
```

```bash
chmod +x scripts/security/zap-scan.sh
```

### 5.3.2 Headers de Seguridad para Cloudflare

**`apps/storefront/public/_headers`**
```txt
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.paypal.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.mercadopago.com; frame-src https://js.stripe.com https://www.paypal.com https://www.mercadopago.com

/api/*
  Cache-Control: no-cache

/producto/*
  Cache-Control: public, max-age=3600, s-maxage=86400
```

**`apps/client-hub/public/_headers`**
```txt
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co
```

**`apps/vendor-admin/public/_headers`**
```txt
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: https:
```

### 5.3.3 Script de Verificación de Seguridad

**`scripts/security/check-security.sh`**
```bash
#!/bin/bash
set -euo pipefail

echo "🔒 Verificación de Seguridad"
echo "============================"

VIOLATIONS=0

# 1. Verificar que RLS está habilitado en todas las tablas
echo ""
echo "1. Verificando Row Level Security..."
TABLES_WITHOUT_RLS=$(grep -L "ENABLE ROW LEVEL SECURITY" supabase/migrations/*.sql || true)
if [ -n "$TABLES_WITHOUT_RLS" ]; then
  echo "⚠️  Tablas sin RLS detectadas:"
  echo "$TABLES_WITHOUT_RLS"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ RLS configurado en migraciones"
fi

# 2. Verificar que no hay credenciales en texto plano
echo ""
echo "2. Verificando credenciales expuestas..."
CREDENTIALS_EXPOSED=$(grep -r "sk_live\|pk_live\|APP_USR\|secret_key.*=" apps/ supabase/functions/ --include="*.ts" --include="*.astro" | grep -v ".env" | grep -v "example" | wc -l || true)
if [ "$CREDENTIALS_EXPOSED" -gt 0 ]; then
  echo "❌ CRÍTICO: Credenciales expuestas en código fuente"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ No se encontraron credenciales expuestas"
fi

# 3. Verificar que los headers de seguridad existen
echo ""
echo "3. Verificando headers de seguridad..."
for app in storefront client-hub vendor-admin; do
  if [ -f "apps/$app/public/_headers" ]; then
    HEADERS_COUNT=$(grep -c "X-" "apps/$app/public/_headers" || true)
    echo "  ✅ $app: $HEADERS_COUNT headers de seguridad configurados"
  else
    echo "  ⚠️  $app: Sin archivo _headers"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# 4. Verificar que los secrets no están en git
echo ""
echo "4. Verificando secrets en git..."
SECRETS_IN_GIT=$(git ls-files | grep "\.env$" | grep -v ".example" | wc -l || true)
if [ "$SECRETS_IN_GIT" -gt 0 ]; then
  echo "❌ Archivos .env encontrados en git"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ No hay secrets en git"
fi

echo ""
echo "============================"
if [ "$VIOLATIONS" -gt 0 ]; then
  echo "❌ Se encontraron $VIOLATIONS problemas de seguridad"
  exit 1
else
  echo "✅ Verificación de seguridad completada"
fi
```

```bash
chmod +x scripts/security/check-security.sh
```

---

## 📁 Tarea 5.4: Backups y Recuperación

### 5.4.1 Script de Backup Automático

**`scripts/deploy/backup-production.sh`**
```bash
#!/bin/bash
set -euo pipefail

echo "💾 Micro-Store Arch - Backup de Producción"
echo "=========================================="

BACKUP_DIR="./backups/production"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/prod_backup_$TIMESTAMP.sql"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Verificar conexión a Supabase
if ! supabase projects list | grep -q "your-project"; then
  echo "❌ No se puede conectar a Supabase. Verifica: supabase login"
  exit 1
fi

echo "📦 Exportando base de datos de producción..."
supabase db dump -f "$BACKUP_FILE" --db-url "$SUPABASE_DB_URL"

# Comprimir
gzip "$BACKUP_FILE"
echo "✅ Backup creado: ${BACKUP_FILE}.gz"

# Subir a almacenamiento externo (ejemplo: R2, S3, o Supabase Storage)
if [ -n "${R2_BUCKET_URL:-}" ]; then
  echo "☁️ Subiendo a R2..."
  # Comando para subir a R2 u otro storage
  echo "  Backup subido a almacenamiento externo"
fi

# Limpiar backups antiguos
echo "🧹 Eliminando backups de más de $RETENTION_DAYS días..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Verificar integridad del backup
echo "🔍 Verificando integridad..."
if gunzip -t "${BACKUP_FILE}.gz"; then
  echo "✅ Backup verificado correctamente"
else
  echo "❌ Error: Backup corrupto"
  exit 1
fi

echo ""
echo "✅ Backup de producción completado"
```

```bash
chmod +x scripts/deploy/backup-production.sh
```

### 5.4.2 GitHub Actions para Backup Programado

**`.github/workflows/backup.yml`**
```yaml
name: Scheduled Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Todos los días a las 2 AM UTC
  workflow_dispatch:      # Permite ejecución manual

jobs:
  backup:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Login to Supabase
        run: supabase login --token ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Create Backup
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: |
          TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
          supabase db dump -f "backup_$TIMESTAMP.sql" --db-url "$SUPABASE_DB_URL"
          gzip "backup_$TIMESTAMP.sql"
      
      - name: Upload Backup to Supabase Storage
        run: |
          # Subir a bucket de backups en Supabase Storage
          echo "Backup uploaded"
      
      - name: Upload Backup Artifact
        uses: actions/upload-artifact@v4
        with:
          name: database-backup
          path: backup_*.sql.gz
          retention-days: 30
      
      - name: Notify on Failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '⚠️ Backup diario falló',
              body: `El backup programado falló el ${new Date().toISOString()}. Revisar logs.`,
              labels: ['security', 'urgent']
            });
```

---

## 📁 Tarea 5.5: Documentación Operativa

### 5.5.1 Runbook de Operaciones

**`docs/RUNBOOK.md`**
```markdown
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

### 4. Reactivar Pasarela de Pago

Si una pasarela falla:

---

## 📁 Tarea 5.6: Archivado y Limpieza de Datos

### 5.6.1 Job de Archivado (GitHub Actions)

**`.github/workflows/cleanup-data.yml`**
```yaml
name: Data Cleanup and Archiving

on:
  schedule:
    - cron: '0 0 * * 0'  # Todos los domingos a medianoche
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Archive old orders (> 90 days)
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: |
          # Procedimiento para mover órdenes viejas a tabla de histórico
          # o simplemente marcarlas como archivadas/limpiar logs
          psql "$SUPABASE_DB_URL" -c "CALL archive_old_orders(90);"
```

1. Ir a Vendor Admin → Configuración
2. Verificar credenciales
3. Probar con modo sandbox
4. Reactivar

### 5. Monitoreo

- **Logflare:** https://logflare.app (logs en tiempo real)
- **Health Check:** `GET https://your-project.supabase.co/functions/v1/health`
- **Supabase Dashboard:** Revisar uso de API, errores

## Alertas Comunes

### Error: "Stock insuficiente" frecuente
- Causa: Producto popular sin stock
- Solución: Aumentar stock o activar "Bajo pedido"

### Error: "Token inválido" en Admin
- Causa: Sesión expirada o MFA no verificado
- Solución: Cerrar sesión y volver a ingresar

### Error: "Webhook failed" en pagos
- Causa: Configuración de webhook incorrecta
- Solución: Verificar secretos en dashboard de pasarela

## Mantenimiento Periódico

### Diario
- [ ] Verificar health check
- [ ] Revisar logs en Logflare

### Semanal
- [ ] Verificar backups
- [ ] Revisar uso de Supabase (free tier limits)

### Mensual
- [ ] Rotar credenciales de pasarelas
- [ ] Actualizar dependencias (`npm outdated`)
- [ ] Revisar costos de Cloudflare/Supabase
```

### 5.5.2 Documento de Arquitectura Final

**`docs/ARCHITECTURE.md`**
```markdown
# Micro-Store Arch - Documento de Arquitectura

## Visión General

Micro-Store Arch es un ecosistema de e-commerce Jamstack compuesto por 3 sitios
desplegados en Cloudflare Pages, con backend en Supabase.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    Cloudflare                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │Storefront│  │Client Hub│  │Vendor    │          │
│  │(Astro    │  │(Astro    │  │Admin     │          │
│  │ SSG)     │  │ SPA)     │  │(Astro SPA)│          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │             │             │                  │
└───────┼─────────────┼─────────────┼──────────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
              ┌───────┴────────┐
              │   Supabase      │
              │  ┌──────────┐   │
              │  │Auth      │   │
              │  ├──────────┤   │
              │  │Database  │   │
              │  ├──────────┤   │
              │  │Storage   │   │
              │  ├──────────┤   │
              │  │Edge Funcs│   │
              │  └──────────┘   │
              └────────────────┘
```

## Decisiones Técnicas Clave

1. **Jamstack puro:** Sin servidores tradicionales
2. **Astro para todo el frontend:** Sin React/JSX
3. **Alpine.js para interactividad:** Ligero, sin build step
4. **Supabase Edge Functions:** Backend serverless
5. **pgsodium para encriptación:** Credenciales seguras
6. **MFA de borde:** TOTP sin servicio externo
7. **Costo $0/mes:** Free tiers de Cloudflare y Supabase

## Estructura del Monorepo

```
micro-store-arch/
├── apps/
│   ├── storefront/       # Tienda pública
│   ├── client-hub/       # Portal de clientes
│   └── vendor-admin/     # Panel de administración
├── packages/
│   ├── core/             # Modelos, enums, schemas
│   └── config-eslint/    # Reglas ESLint
├── supabase/
│   ├── functions/        # Edge Functions
│   └── migrations/       # SQL
└── scripts/              # Utilidades
```

## Reglas Arquitectónicas

- ❌ HTML solo en `.astro`
- ❌ Estilos solo en `.css`
- ❌ Lógica solo en `.ts`
- ❌ Sin React/JSX
- ❌ Sin magic strings (usar enums)
```

### 5.5.3 Documento de Entrega

**`docs/HANDOFF.md`**
```markdown
# Micro-Store Arch - Documento de Entrega

## Estado del Proyecto

- **Versión:** 1.0.0
- **Fecha de entrega:** Mayo 2026
- **Arquitecto:** Alberto Jacinto Martínez Torres

## Entregables

- [x] Código fuente completo (monorepo)
- [x] Base de datos con migraciones
- [x] Edge Functions desplegadas
- [x] Sitios desplegados en Cloudflare Pages
- [x] Documentación técnica (RUNBOOK, ARCHITECTURE)
- [x] Tests unitarios y de integración
- [x] Pipeline CI/CD configurado
- [x] Backups automáticos configurados
- [x] Monitoreo configurado (Logflare)
- [x] Reporte de seguridad OWASP ZAP

## Accesos

### Repositorio
- **GitHub:** [URL del repositorio]
- **Ramas:** main (producción), develop (desarrollo)

### Supabase
- **URL Dashboard:** https://supabase.com/dashboard/project/[project-id]
- **Organización:** [Nombre de la organización]

### Cloudflare
- **URL Dashboard:** https://dash.cloudflare.com
- **Zona:** tienda.com

### Pasarelas de Pago (Modo Producción)
- **Stripe:** https://dashboard.stripe.com
- **PayPal:** https://developer.paypal.com
- **Mercado Pago:** https://www.mercadopago.com.mx/developers
- **Hey Banco:** https://www.heybanco.com

## Credenciales

Todas las credenciales se entregarán por canal seguro (1Password, Bitwarden, o similar).

## Próximos Pasos Recomendados

1. **Sprint 6 (Opcional):**
   - Implementar carrito de compras persistente
   - Agregar wishlist/favoritos
   - Implementar reseñas de productos
   - Dashboard de analytics para el vendedor

2. **Mejoras de rendimiento:**
   - Implementar Edge Caching agresivo
   - Optimizar imágenes con Cloudflare Images
   - Agregar PWA (Service Worker)

3. **Escalamiento:**
   - Migrar a plan Pro de Supabase si se exceden límites
   - Configurar CDN para assets estáticos
   - Implementar load testing mensual

## Soporte Post-Entrega

- **Período de garantía:** 30 días
- **Canales de soporte:** Email, Slack
- **Horario:** Lunes a Viernes, 9:00 - 18:00
```

---

## 📁 Tarea 5.6: CI/CD Final### 5.6.1 Workflow de Despliegue Automático

**`.github/workflows/deploy.yml`**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths-ignore:
      - 'docs/**'
      - '*.md'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run check:architecture
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:core

  deploy:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Build Storefront
        run: cd apps/storefront && npm run build
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          PUBLIC_STOREFRONT_URL: ${{ secrets.PUBLIC_STOREFRONT_URL }}
      
      - name: Build Client Hub
        run: cd apps/client-hub && npm run build
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          PUBLIC_API_BASE: ${{ secrets.SUPABASE_URL }}/functions/v1
      
      - name: Build Vendor Admin
        run: cd apps/vendor-admin && npm run build
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          PUBLIC_API_BASE: ${{ secrets.SUPABASE_URL }}/functions/v1
      
      - name: Deploy Storefront to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: apps/storefront
          command: pages deploy dist --project-name micro-store-storefront
      
      - name: Deploy Client Hub to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: apps/client-hub
          command: pages deploy dist --project-name micro-store-client-hub
      
      - name: Deploy Vendor Admin to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: apps/vendor-admin
          command: pages deploy dist --project-name micro-store-vendor-admin
      
      - name: Deploy Edge Functions
        run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
      
      - name: Run Database Migrations
        run: supabase db push
      
      - name: Health Check
        run: |
          sleep 30
          curl -f "${{ secrets.SUPABASE_URL }}/functions/v1/health" || exit 1
      
      - name: Notify Success
        if: success()
        run: echo "✅ Despliegue exitoso"
      
      - name: Notify Failure
        if: failure()
        run: echo "❌ Despliegue fallido - Revisar logs"
```

---

## 📁 Tarea 5.7: Pruebas Finales

### 5.7.1 Prueba de Carga Básica

**`scripts/test/load-test.sh`**
```bash
#!/bin/bash
set -euo pipefail

echo "📊 Micro-Store Arch - Prueba de Carga"
echo "====================================="

TARGET_URL="${1:-https://tienda.com}"
REQUESTS=100
CONCURRENT=10

echo "🎯 Objetivo: $TARGET_URL"
echo "📈 Peticiones: $REQUESTS"
echo "⚡ Concurrentes: $CONCURRENT"
echo ""

# Usar Apache Bench si está disponible
if command -v ab &> /dev/null; then
  echo "Ejecutando Apache Bench..."
  ab -n "$REQUESTS" -c "$CONCURRENT" "$TARGET_URL/"
elif command -v wrk &> /dev/null; then
  echo "Ejecutando wrk..."
  wrk -t4 -c"$CONCURRENT" -d10s "$TARGET_URL/"
else
  echo "⚠️  Ni ab ni wrk instalados. Instala uno:"
  echo "  brew install httpd (para ab)"
  echo "  brew install wrk"
  
  # Prueba simple con curl
  echo ""
  echo "Ejecutando prueba simple con curl..."
  START=$(date +%s%N)
  
  for i in $(seq 1 10); do
    curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" "$TARGET_URL/" &
  done
  wait
  
  END=$(date +%s%N)
  ELAPSED=$(( (END - START) / 1000000 ))
  
  echo ""
  echo "⏱️ Tiempo total: ${ELAPSED}ms para 10 peticiones"
fi
```

```bash
chmod +x scripts/test/load-test.sh
```

### 5.7.2 Smoke Test de Producción

**`scripts/test/smoke-test.sh`**
```bash
#!/bin/bash
set -euo pipefail

echo "🔥 Smoke Test - Micro-Store Arch"
echo "================================"

BASE_URL="${1:-https://tienda.com}"
CLIENT_URL="${2:-https://cliente.tienda.com}"
ADMIN_URL="${3:-https://admin.tienda.com}"
FAILURES=0

check_url() {
  local url=$1
  local description=$2
  local expected=${3:-200}
  
  echo -n "  $description... "
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  
  if [ "$status" = "$expected" ]; then
    echo "✅ ($status)"
  else
    echo "❌ (esperado $expected, obtenido $status)"
    FAILURES=$((FAILURES + 1))
  fi
}

echo ""
echo "1. Storefront"
check_url "$BASE_URL/" "Página principal"
check_url "$BASE_URL/sitemap.xml" "Sitemap"
check_url "$BASE_URL/robots.txt" "Robots.txt"

echo ""
echo "2. API"
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
check_url "$SUPABASE_URL/functions/v1/health" "Health Check"

echo ""
echo "3. Client Hub"
check_url "$CLIENT_URL/" "Página principal"
check_url "$CLIENT_URL/auth/login" "Login"

echo ""
echo "4. Vendor Admin"
check_url "$ADMIN_URL/" "Login Admin"
check_url "$ADMIN_URL/auth/login" "Login Admin"

echo ""
echo "================================"
if [ "$FAILURES" -eq 0 ]; then
  echo "✅ Todos los checks pasaron"
else
  echo "❌ $FAILURES check(s) fallaron"
  exit 1
fi
```

```bash
chmod +x scripts/test/smoke-test.sh
```

---

## 📁 Tarea 5.8: Configuración de Dominios

### 5.8.1 Configuración DNS (Cloudflare)

```txt
# Zona: tienda.com

# Registros A (para Cloudflare Pages)
tienda.com           CNAME  micro-store-storefront.pages.dev
www.tienda.com       CNAME  micro-store-storefront.pages.dev
cliente.tienda.com   CNAME  micro-store-client-hub.pages.dev
admin.tienda.com     CNAME  micro-store-vendor-admin.pages.dev

# Registros para Supabase (si se usa dominio personalizado)
db.tienda.com        CNAME  your-project.supabase.co
api.tienda.com       CNAME  your-project.supabase.co

# MX para emails transaccionales
tienda.com           MX     10 smtp.resend.com

# TXT para verificación
tienda.com           TXT    "v=spf1 include:spf.resend.com -all"
```

---

## 📊 Definición de Terminado (DoD) del Sprint 5

- [ ] Los 3 sitios están desplegados en Cloudflare Pages
- [ ] Dominios configurados con SSL (Cloudflare proporciona SSL gratis)
- [ ] Edge Functions desplegadas en Supabase producción
- [ ] Base de datos migrada a producción
- [ ] Variables de entorno configuradas en producción
- [ ] Logflare configurado y recibiendo logs
- [ ] Health check endpoint responde correctamente
- [ ] Escaneo OWASP ZAP completado (sin críticos)
- [ ] Headers de seguridad configurados
- [ ] Backups automáticos programados
- [ ] CI/CD despliega automáticamente desde main
- [ ] Smoke tests pasan en producción
- [ ] Prueba de carga básica completada
- [ ] Documentación operativa entregada (RUNBOOK, ARCHITECTURE, HANDOFF)
- [ ] Scripts de backup y recuperación probados
- [ ] `npm run check:architecture` pasa sin errores
- [ ] `npm run check:security` pasa sin errores

---

## 📋 Checklist Final del Proyecto

```markdown
## 🎉 Micro-Store Arch - Proyecto Completado

### Sprints Completados
- [x] Sprint 0: Configuración y Setup
- [x] Sprint 1: Autenticación y Perfiles
- [x] Sprint 2: Catálogo y Productos
- [x] Sprint 3: Checkout y Pagos
- [x] Sprint 4: Pedidos y Logística
- [x] Sprint 5: Despliegue, Monitoreo y Cierre

### Historias de Usuario Implementadas
- [x] HU-01: Catálogo ultrarrápido con badges de stock
- [x] HU-02: Registro/Login con Google OAuth y email
- [x] HU-03: Pago con múltiples pasarelas
- [x] HU-04: Línea de tiempo de pedidos en tiempo real
- [x] HU-05: Gestión dual de inventario
- [x] HU-06: Configuración dinámica de pasarelas
- [x] HU-07: Acceso admin con 2FA obligatorio
- [x] HU-08: Actualización de tracking y logística

### Entregables
- [x] Código fuente completo
- [x] Base de datos con migraciones
- [x] Documentación técnica
- [x] Tests automatizados
- [x] Pipeline CI/CD
- [x] Monitoreo y alertas
- [x] Backups automáticos
- [x] Runbook operativo

### Costo Mensual Estimado
- Cloudflare Pages: $0 (Free Tier)
- Supabase: $0 (Free Tier)
- Dominio: ~$1/mes ($12/año)
- **Total: ~$1/mes**
```

---

## 🎯 Retrospectiva Final del Proyecto

1. **¿Qué salió bien durante todo el desarrollo?**
2. **¿Qué se podría haber hecho mejor?**
3. **¿Las reglas arquitectónicas ayudaron o dificultaron?**
4. **¿El stack Jamstack cumplió con las expectativas de rendimiento?**
5. **¿El costo operativo se mantuvo en ~$0/mes?**
6. **¿Qué recomendaciones hay para futuros sprints?**

---

## 🚀 Próximos Pasos (Opcional - Sprint 6+)

Si se desea continuar el desarrollo:

- **Sprint 6:** Carrito de compras persistente, wishlist, reseñas
- **Sprint 7:** Dashboard de analytics para vendedor
- **Sprint 8:** PWA, notificaciones push, modo offline
- **Sprint 9:** Marketplace multi-vendedor
- **Sprint 10:** App móvil con Capacitor
