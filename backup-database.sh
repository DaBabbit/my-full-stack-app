#!/bin/bash

# =====================================================
# Supabase Database Backup Script
# =====================================================
# Erstellt ein vollständiges Backup aller Tabellen
# vor der Invoice Ninja Migration

set -e

echo "🔄 Lade Environment Variables..."

# Check ob .env.local existiert
if [ ! -f .env.local ]; then
    echo "❌ Fehler: .env.local nicht gefunden!"
    echo "Bitte stelle sicher, dass .env.local existiert mit:"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Lade .env.local
export $(cat .env.local | grep -v '^#' | xargs)

# Prüfe ob Variablen gesetzt sind
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Fehler: NEXT_PUBLIC_SUPABASE_URL nicht gesetzt!"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Fehler: SUPABASE_SERVICE_ROLE_KEY nicht gesetzt!"
    exit 1
fi

# Extrahiere Project Ref aus URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')
echo "📦 Supabase Project: $PROJECT_REF"

# Erstelle Backup-Verzeichnis
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR

# Timestamp für Dateinamen
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/supabase_backup_$TIMESTAMP.sql"

echo "💾 Starte Backup..."

# PostgreSQL Connection String
# Supabase Format: https://PROJECT_REF.supabase.co
# PostgreSQL Format: postgresql://postgres:[PASSWORD]@PROJECT_REF.supabase.co:5432/postgres

# Versuche mit Service Role Key als Password
# HINWEIS: Für direkten pg_dump braucht man das Database Password, nicht den Service Role Key!
# Der Service Role Key ist für die API, nicht für direkten DB-Zugriff.

echo ""
echo "⚠️  WICHTIG:"
echo "Für den Backup-Export brauchst du das DATABASE PASSWORD, nicht den Service Role Key!"
echo ""
echo "Hole das Database Password hier:"
echo "1. Gehe zu: https://supabase.com/dashboard/project/$PROJECT_REF"
echo "2. Settings → Database → Connection string"
echo "3. Kopiere das Password aus der Connection String"
echo ""
read -sp "Bitte Database Password eingeben: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Kein Password eingegeben!"
    exit 1
fi

# Baue Connection String
CONNECTION_STRING="postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres"

echo "🔄 Exportiere alle Tabellen..."

# Finde pg_dump (versuche verschiedene Pfade, bevorzuge Version 17)
PG_DUMP=""
if [ -f "/opt/homebrew/opt/postgresql@17/bin/pg_dump" ]; then
    PG_DUMP="/opt/homebrew/opt/postgresql@17/bin/pg_dump"
elif [ -f "/usr/local/opt/postgresql@17/bin/pg_dump" ]; then
    PG_DUMP="/usr/local/opt/postgresql@17/bin/pg_dump"
elif command -v pg_dump &> /dev/null; then
    PG_DUMP="pg_dump"
elif [ -f "/opt/homebrew/opt/postgresql@15/bin/pg_dump" ]; then
    PG_DUMP="/opt/homebrew/opt/postgresql@15/bin/pg_dump"
elif [ -f "/usr/local/opt/postgresql@15/bin/pg_dump" ]; then
    PG_DUMP="/usr/local/opt/postgresql@15/bin/pg_dump"
else
    echo "❌ pg_dump nicht gefunden!"
    echo "Bitte installiere PostgreSQL 17:"
    echo "  brew install postgresql@17"
    echo ""
    echo "Oder verwende Supabase Dashboard Backup:"
    echo "  https://supabase.com/dashboard/project/$PROJECT_REF → Database → Backups"
    exit 1
fi

echo "📍 Verwende: $PG_DUMP"

# Führe pg_dump aus
$PG_DUMP "$CONNECTION_STRING" \
  --schema=public \
  --format=plain \
  --no-owner \
  --no-acl \
  --file="$BACKUP_FILE" 2>&1 | grep -v "NOTICE:"

if [ $? -eq 0 ]; then
    echo "✅ Backup erfolgreich erstellt!"
    echo "📁 Datei: $BACKUP_FILE"
    echo "📊 Größe: $(du -h $BACKUP_FILE | cut -f1)"
    echo ""
    
    # Liste wichtige Tabellen
    echo "📋 Exportierte Tabellen:"
    grep "^CREATE TABLE" $BACKUP_FILE | sed 's/CREATE TABLE public\./  - /' | sed 's/ (.*//'
    
    echo ""
    echo "🎉 Backup abgeschlossen!"
    echo ""
    echo "Zum Restore später verwenden:"
    echo "  psql \"$CONNECTION_STRING\" < $BACKUP_FILE"
else
    echo "❌ Backup fehlgeschlagen!"
    echo ""
    echo "Prüfe ob pg_dump installiert ist:"
    echo "  brew install postgresql@15  (macOS)"
    echo "  apt-get install postgresql-client  (Linux)"
    exit 1
fi

