# Datenbank-Migrationen

Dieses Verzeichnis enthält alle SQL-Migrationsskripte, organisiert nach Kategorie.

## Struktur

- **stripe-legacy/** - Alte Stripe-bezogene Migrationen (für Referenz)
- **subscriptions/** - Abo-System Migrationen
- **videos/** - Video-Management Migrationen
- **referrals/** - Empfehlungssystem Migrationen
- **workspace/** - Workspace-Collaboration Migrationen
- **storage/** - Nextcloud/Storage Migrationen
- **automation/** - Automation-Tabellen
- **users/** - User-Management Migrationen
- **rls-fixes/** - Row Level Security Fixes
- **social-media/** - Social Media Integration Schemas
- **invitations/** - Einladungssystem Migrationen
- **general/** - Allgemeine Migrationen und Fixes

## Hinweise

- Migrationen sollten IMMER erst in der Entwicklungsumgebung getestet werden
- Backup der Datenbank vor größeren Migrationen erstellen
- Stripe-Legacy Dateien werden bei der Invoice Ninja Migration nicht mehr benötigt

