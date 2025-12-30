# Invoice Ninja Subscription-Workflow

## Übersicht

Vollautomatischer Subscription-Workflow mit Invoice Ninja + GoCardless SEPA-Lastschrift. Ersetzt manuelle Zahlungslinks durch automatisierte Erstellung und Verwaltung.

## Workflow für NEUE Kunden

### 1. User-Registrierung
- User registriert sich in der WebApp
- Erhält Account mit Email-Adresse

### 2. Subscription-Abschluss
- User navigiert zu `/pay`
- Klickt auf "Jetzt abonnieren - 29,99€/Monat"

### 3. Automatische Erstellung
**Backend:**
1. Prüft ob User bereits Subscription hat (Supabase)
2. Prüft ob Client mit Email bereits in Invoice Ninja existiert
3. Falls nicht: Erstellt neuen Client in Invoice Ninja
4. Erstellt Recurring Invoice (monatlich, Auto-Bill via GoCardless)
5. Speichert Verknüpfung in Supabase

**Implementierung:** [`app/api/invoice-ninja/create-subscription/route.ts`](../../app/api/invoice-ninja/create-subscription/route.ts)

### 4. SEPA-Mandat einrichten
- User wird zum Invoice Ninja Client Portal weitergeleitet
- Richtet SEPA-Lastschriftmandat ein
- Test-IBAN für Sandbox: `DE89370400440532013000`

### 5. Erste Zahlung
- Invoice Ninja erstellt automatisch erste Rechnung
- GoCardless zieht Betrag via SEPA ein (5 Werktage Vorlauf)
- Status in WebApp wird auf "active" gesetzt

### 6. Monatliche Abbuchung
- Invoice Ninja erstellt monatlich neue Rechnung
- GoCardless zieht automatisch ab (2 Werktage Vorlauf)
- Kein manuelles Eingreifen nötig

## Workflow für EXISTIERENDE Kunden

**Problem:** Kunden existieren bereits in Invoice Ninja (z.B. durch manuelle Zahlungslinks), sind aber nicht mit WebApp-Accounts verknüpft.

**Lösung:** Automatische Migration via Email-Matching

### Automatisches Linking beim Login

1. User loggt sich ein (z.B. `dk136@hdm-stuttgart.de`)
2. `useSubscription` Hook prüft Subscription in Supabase
3. Keine Subscription gefunden → Auto-Linking wird getriggert
4. API sucht in Invoice Ninja nach Client mit gleicher Email
5. Client gefunden → Verknüpfung wird in Supabase erstellt
6. Status wird synchronisiert → "active" angezeigt

**Implementierung:**
- Hook: [`hooks/useSubscription.ts`](../../hooks/useSubscription.ts)
- API: [`app/api/invoice-ninja/link-existing-client/route.ts`](../../app/api/invoice-ninja/link-existing-client/route.ts)

### Beispiel: Kunde #27

**Vor Migration:**
- Kunde #27 in Invoice Ninja: `dk136@hdm-stuttgart.de`
- WebApp-Account: `dk136@hdm-stuttgart.de`
- Status in WebApp: "Kein Abo"

**Nach Migration (automatisch beim Login):**
- Verknüpfung erstellt in Supabase
- Status in WebApp: "Aktiv"
- Kunde kann Abo in WebApp verwalten

## Status-Synchronisation

### Automatischer Sync

**Intervall:** Alle 5 Minuten (beim Login/Seitenaufruf)

**Implementierung:** [`app/api/invoice-ninja/sync-status/route.ts`](../../app/api/invoice-ninja/sync-status/route.ts)

**Ablauf:**
1. Lädt Subscription aus Supabase
2. Prüft `last_api_sync` Zeitstempel
3. Falls > 5 Minuten: API-Call zu Invoice Ninja
4. Prüft bezahlte Rechnungen im aktuellen Zeitraum
5. Updated Status in Supabase: `active`, `past_due`, `canceled`, oder `pending`

### Status-Definitionen

| Status | Bedeutung | Invoice Ninja Zustand |
|--------|-----------|----------------------|
| `pending` | Abo erstellt, keine Zahlung | Kein Payment oder Recurring Invoice inaktiv |
| `active` | Abo aktiv, Zahlung erfolgt | Bezahlte Rechnung im aktuellen Monat |
| `past_due` | Zahlung ausstehend (Grace Period 7 Tage) | Unbezahlte Rechnung, Fälligkeit < 7 Tage |
| `canceled` | Abo gekündigt oder Zahlung > 7 Tage überfällig | Recurring Invoice gestoppt oder lange überfällig |

## Abo-Verwaltung durch Kunden

### In der WebApp

**Seite:** [`app/profile/manage-subscription/page.tsx`](../../app/profile/manage-subscription/page.tsx)

**Funktionen:**
- ✅ Status anzeigen (Aktiv, Gekündigt, etc.)
- ✅ Abo kündigen (Recurring Invoice stoppen)
- ✅ Abo reaktivieren (Recurring Invoice reaktivieren)
- ✅ Link zum Client Portal (für SEPA-Mandat & Rechnungsdetails)

### Im Invoice Ninja Client Portal

**Zugriff:** Button "Kundenportal öffnen" in WebApp

**Funktionen:**
- ✅ SEPA-Lastschriftmandat verwalten
- ✅ Alle Rechnungen anzeigen
- ✅ Rechnungen als PDF herunterladen
- ✅ Zahlungsmethode ändern
- ✅ Zahlungshistorie

## Rechnungsübersicht

**Seite:** [`app/profile/invoices/page.tsx`](../../app/profile/invoices/page.tsx)

**Funktionen:**
- Liste aller Rechnungen aus Invoice Ninja
- Status-Labels (Bezahlt, Gesendet, Überfällig, etc.)
- PDF-Download-Links
- Fälligkeitsdaten

**Implementierung:** [`app/api/invoice-ninja/invoices/route.ts`](../../app/api/invoice-ninja/invoices/route.ts)

## Referral-System

### Rabatt-Anwendung

**Workflow:**
1. User A wirbt User B über Referral-Code
2. User B abonniert und zahlt erste Rechnung
3. Referral-Status wird auf "completed" gesetzt
4. Bei User A's nächster Rechnung: 250€ Rabatt wird automatisch angewendet

**Implementierung:** [`app/api/referrals/apply-credit/route.ts`](../../app/api/referrals/apply-credit/route.ts)

**Hinweis:** Invoice Ninja hat kein natives Coupon-System wie Stripe. Rabatte werden als Line Item Discounts auf Rechnungen angewendet.

## Vorteile gegenüber manuellen Zahlungslinks

### Alt (Manuell)
❌ Zahlungslink manuell in Invoice Ninja erstellen  
❌ Link manuell per Email an Kunde senden  
❌ Manuelle Nachverfolgung ob Kunde gezahlt hat  
❌ Manuelle Erneuerung jeden Monat  
❌ Keine Integration in WebApp

### Neu (Automatisch)
✅ Klick auf "Jetzt abonnieren" → Alles automatisch  
✅ Recurring Invoice wird automatisch erstellt  
✅ Monatliche Abbuchung vollautomatisch  
✅ Status-Sync in WebApp (alle 5 Min)  
✅ Kunde kann Abo selbst verwalten  
✅ Existierende Kunden werden automatisch migriert

## Technische Details

### API-Routen

| Route | Funktion | Datei |
|-------|----------|-------|
| `/api/invoice-ninja/create-subscription` | Neue Subscription erstellen | [`create-subscription/route.ts`](../../app/api/invoice-ninja/create-subscription/route.ts) |
| `/api/invoice-ninja/link-existing-client` | Existierenden Client verknüpfen | [`link-existing-client/route.ts`](../../app/api/invoice-ninja/link-existing-client/route.ts) |
| `/api/invoice-ninja/sync-status` | Status synchronisieren | [`sync-status/route.ts`](../../app/api/invoice-ninja/sync-status/route.ts) |
| `/api/invoice-ninja/cancel-subscription` | Abo kündigen | [`cancel-subscription/route.ts`](../../app/api/invoice-ninja/cancel-subscription/route.ts) |
| `/api/invoice-ninja/reactivate-subscription` | Abo reaktivieren | [`reactivate-subscription/route.ts`](../../app/api/invoice-ninja/reactivate-subscription/route.ts) |
| `/api/invoice-ninja/client-portal` | Portal-URL abrufen | [`client-portal/route.ts`](../../app/api/invoice-ninja/client-portal/route.ts) |
| `/api/invoice-ninja/invoices` | Rechnungen laden | [`invoices/route.ts`](../../app/api/invoice-ninja/invoices/route.ts) |

### Invoice Ninja Utility

**Datei:** [`utils/invoice-ninja.ts`](../../utils/invoice-ninja.ts)

**Funktionen:**
- `createClient()` - Client erstellen
- `getClient()` - Client laden
- `searchClientsByEmail()` - Email-basierte Suche
- `createRecurringInvoice()` - Recurring Invoice erstellen
- `getClientRecurringInvoices()` - Recurring Invoices laden
- `updateRecurringInvoice()` - Status ändern (stop/pause/resume)
- `getClientInvoices()` - Rechnungen laden
- `checkSubscriptionStatus()` - Status prüfen
- `getClientPortalUrl()` - Portal-URL generieren

## Testing

### Test mit neuem Kunden
1. Registriere Test-User
2. Gehe zu `/pay`
3. Klicke "Jetzt abonnieren"
4. Richte SEPA-Mandat im Portal ein
5. Prüfe Status in WebApp (sollte "pending" → "active" nach Zahlung)

### Test mit existierendem Kunden
1. Logout
2. Login mit existierender Email (z.B. `dk136@hdm-stuttgart.de`)
3. Auto-Linking sollte automatisch erfolgen
4. Status sollte "active" anzeigen

### Test Kündigung
1. Gehe zu `/profile/manage-subscription`
2. Klicke "Abo kündigen"
3. Status sollte "canceled" anzeigen
4. Recurring Invoice in Invoice Ninja sollte gestoppt sein

## Troubleshooting

### Problem: Auto-Linking funktioniert nicht
**Lösung:**
- Prüfe Browser Console: `[useSubscription] Auto-Linking...`
- Prüfe Email-Match (exakte Übereinstimmung)
- Prüfe Invoice Ninja Logs

### Problem: Status bleibt auf "pending"
**Lösung:**
- Prüfe ob SEPA-Mandat eingerichtet ist
- Prüfe ob erste Rechnung erstellt wurde
- Manuell Sync triggern: `/api/invoice-ninja/sync-status`

### Problem: Duplikat-Client wird erstellt
**Lösung:**
- Sollte nicht passieren (Email-Duplikat-Check ist implementiert)
- Falls doch: Manuell in Invoice Ninja löschen oder mergen

## Support

Bei Problemen:
1. Browser Console Logs prüfen (`[useSubscription]`, `[Create Subscription]`)
2. Vercel Function Logs prüfen
3. Invoice Ninja Logs prüfen (Docker: `docker logs <container>`)
4. Supabase `subscriptions` Tabelle prüfen

## Dokumentation

- Setup: [`docs/setup/INVOICE_NINJA_TESTING.md`](../setup/INVOICE_NINJA_TESTING.md)
- Deployment: [`docs/deployment/INVOICE_NINJA_DEPLOYMENT.md`](../deployment/INVOICE_NINJA_DEPLOYMENT.md)
- Migration Complete: [`INVOICE_NINJA_MIGRATION_COMPLETE.md`](../../INVOICE_NINJA_MIGRATION_COMPLETE.md)

