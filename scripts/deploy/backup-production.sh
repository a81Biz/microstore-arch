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

# Limpiar backups antiguos
echo "🧹 Eliminando backups de más de $RETENTION_DAYS días..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Verificar integridad del backup
echo "🔍 Verificando integridad del archivo comprimido..."
if gunzip -t "${BACKUP_FILE}.gz"; then
  echo "✅ Integridad del backup verificada (GZIP OK)"
else
  echo "❌ Error: El archivo de backup está corrupto"
  exit 1
fi

echo ""
echo "✅ Backup de producción completado"
