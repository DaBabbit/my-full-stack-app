# 🏗️ KOMPLETTE SYNC-ARCHITEKTUR: Invoice Ninja ↔ Supabase

## 🎯 ZIEL
Invoice Ninja Clients und Recurring Invoices bleiben **automatisch synchron** mit Supabase `subscriptions` Tabelle.

---

## 📊 AKTUELLE STRUKTUR (Was wir haben)

### Supabase Schema: `subscriptions` Tabelle

```sql
CREATE TABLE public.subscriptions (
  -- Primary
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,  -- FK zu auth.users
  
  -- Invoice Ninja IDs
  invoice_ninja_client_id TEXT,           -- Client ID in Invoice Ninja
  invoice_ninja_subscription_id TEXT,     -- Recurring Invoice ID
  invoice_ninja_invoice_id TEXT,          -- Letzte generierte Invoice ID
  
  -- Status & Billing
  status TEXT,                            -- 'active' | 'pending' | 'past_due' | 'canceled'
  payment_method TEXT DEFAULT 'gocardless_sepa',
  gocardless_mandate_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Sync & Metadata
  last_api_sync TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Legacy Stripe (werden entfernt)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
);
```

### Invoice Ninja Entities

```
Client (Customer)
  ├─ id: "z3YaOYpdxq"
  ├─ email: "dk136@hdm-stuttgart.de"
  ├─ contacts[0].contact_key: "abc123xyz"  ← Für Client Portal Login
  └─ custom_value1: "<user_id>"            ← Unsere Supabase User ID

Recurring Invoice (Subscription)
  ├─ id: "xxxxx"
  ├─ client_id: "z3YaOYpdxq"
  ├─ frequency_id: "5" (= monthly)
  ├─ status_id: "2" (= active)
  ├─ auto_bill: "always" (= GoCardless)
  ├─ next_send_date: "2025-02-01"
  └─ line_items: [{ cost: 29.99, ... }]

Invoice (Einzelrechnung)
  ├─ id: "yyyyy"
  ├─ client_id: "z3YaOYpdxq"
  ├─ status_id: "4" (= paid) | "2" (= sent/unpaid)
  ├─ date: "2025-01-01"
  ├─ due_date: "2025-01-15"
  └─ amount: 29.99
```

---

## 🔄 SYNC-FLOW (Wie es funktioniert)

### Status-Definitionen

| Status | Bedeutung | Invoice Ninja | Supabase | Frontend Zugriff |
|--------|-----------|---------------|----------|------------------|
| **active** | Abo aktiv, bezahlt | ✅ Bezahlte Rechnung in letzten 30 Tagen | `status='active'` | ✅ Vollen Zugriff |
| **pending** | Abo erstellt, wartet auf Zahlung | ⏳ Recurring Invoice erstellt, keine Zahlung | `status='pending'` | ❌ Kein Zugriff |
| **past_due** | Zahlung überfällig (Grace Period) | ⚠️ Unbezahlte Rechnung, < 7 Tage überfällig | `status='past_due'` | ✅ Zugriff (7 Tage Grace) |
| **canceled** | Abo gekündigt | ❌ Recurring Invoice gestoppt ODER > 7 Tage überfällig | `status='canceled'` | ❌ Kein Zugriff |

### Sync-Mechanismus (AKTUELL: API-Polling)

```
┌─────────────────┐
│   User Login    │
│  oder Seitenauf │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ useSubscription │ ← React Hook
│   Hook läuft    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Prüfe last_api  │
│ _sync in Supa   │  
│ base            │
└────────┬────────┘
         │
         v
    > 5 Min?
    /     \
   NO     YES
   │       │
   │       v
   │  ┌─────────────────┐
   │  │ Call API Route  │
   │  │ /sync-status    │
   │  └────────┬────────┘
   │           │
   │           v
   │  ┌─────────────────┐
   │  │ Invoice Ninja   │
   │  │ checkSubscrip   │
   │  │ tionStatus()    │
   │  └────────┬────────┘
   │           │
   │           v
   │  ┌─────────────────┐
   │  │ Update Supabase │
   │  │ status, current │
   │  │ _period_end     │
   │  └────────┬────────┘
   │           │
   └───────────┴────────> 
         │
         v
┌─────────────────┐
│ Frontend zeigt  │
│ aktuellen Status│
└─────────────────┘
```

---

## ⚙️ SYNC-LOGIK (Code-Ebene)

### `checkSubscriptionStatus()` in `utils/invoice-ninja.ts`

**Aktueller Code (Zeile 345-414):**

```typescript
export async function checkSubscriptionStatus(
  clientId: string
): Promise<SubscriptionStatus> {
  // 1. Prüfe bezahlte Rechnungen in letzten 30 Tagen
  const paidInvoices = await getClientInvoices(clientId, {
    status: 'paid',
    date_from: thirtyDaysAgo.toISOString().split('T')[0],
  });

  if (paidInvoices.data && paidInvoices.data.length > 0) {
    // Hat bezahlt → Status = 'active'
    return {
      isActive: true,
      status: 'active',
      currentPeriodEnd: nextBillingDate,
      lastInvoice: latestInvoice,
    };
  }

  // 2. Prüfe unbezahlte Rechnungen
  const unpaidInvoices = await getClientInvoices(clientId, { status: 'unpaid' });
  
  if (unpaidInvoices.data && unpaidInvoices.data.length > 0) {
    const daysPastDue = ...;
    
    // Grace Period: 7 Tage
    if (daysPastDue <= 7) {
      return { isActive: true, status: 'past_due' };
    } else {
      return { isActive: false, status: 'canceled' };
    }
  }

  // 3. Keine Rechnungen gefunden → Status = 'pending'
  return { isActive: false, status: 'pending' };
}
```

**❌ PROBLEM:** Diese Logik prüft nur **Invoices** (einzelne Rechnungen), NICHT **Recurring Invoices** (Abos)!

**➡️ Wenn ein Client eine aktive Recurring Invoice hat, aber noch keine bezahlte Rechnung, bleibt Status auf "pending"!**

Das ist genau das Problem bei User `dk136@hdm-stuttgart.de` (Customer #27)!

---

## 🔧 LÖSUNG: Verbesserte Sync-Logik

### Neue `checkSubscriptionStatus()` Funktion

```typescript
export async function checkSubscriptionStatus(
  clientId: string
): Promise<SubscriptionStatus> {
  try {
    // SCHRITT 1: Prüfe ZUERST Recurring Invoices (= Abo-Status)
    const recurringInvoices = await getClientRecurringInvoices(clientId);
    const activeRecurring = recurringInvoices.find(
      (inv: any) => inv.status_id === '2' // '2' = Active
    );

    if (activeRecurring) {
      // Hat aktives Abo → Status abhängig von Zahlungen

      // SCHRITT 2: Prüfe letzte bezahlte Rechnung
      const paidInvoices = await getClientInvoices(clientId, {
        status: 'paid',
        date_from: thirtyDaysAgo.toISOString().split('T')[0],
      });

      if (paidInvoices.data && paidInvoices.data.length > 0) {
        // Aktives Abo + Bezahlte Rechnung = ACTIVE
        const latestInvoice = paidInvoices.data[0];
        const nextBillingDate = new Date(activeRecurring.next_send_date);

        return {
          isActive: true,
          status: 'active',
          currentPeriodEnd: nextBillingDate,
          lastInvoice: latestInvoice,
        };
      }

      // SCHRITT 3: Prüfe unbezahlte Rechnungen
      const unpaidInvoices = await getClientInvoices(clientId, { status: 'unpaid' });
      
      if (unpaidInvoices.data && unpaidInvoices.data.length > 0) {
        const oldestUnpaid = unpaidInvoices.data[unpaidInvoices.data.length - 1];
        const dueDate = new Date(oldestUnpaid.due_date);
        const daysPastDue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Grace Period: 7 Tage
        if (daysPastDue <= 7) {
          return {
            isActive: true,
            status: 'past_due',
            currentPeriodEnd: new Date(activeRecurring.next_send_date),
            lastInvoice: oldestUnpaid,
          };
        } else {
          return {
            isActive: false,
            status: 'canceled',
            lastInvoice: oldestUnpaid,
          };
        }
      }

      // Aktives Abo, aber noch keine Rechnungen generiert
      // Kann passieren wenn Recurring Invoice gerade erst erstellt wurde
      // Oder wenn next_send_date in der Zukunft liegt
      const nextSendDate = new Date(activeRecurring.next_send_date);
      const today = new Date();

      if (nextSendDate > today) {
        // Erste Rechnung kommt erst in der Zukunft → Status = ACTIVE (Trial/Prepaid)
        return {
          isActive: true,
          status: 'active',
          currentPeriodEnd: nextSendDate,
        };
      } else {
        // Rechnung sollte schon erstellt sein, aber ist nicht da → Status = PENDING
        return {
          isActive: false,
          status: 'pending',
        };
      }
    }

    // SCHRITT 4: Kein aktives Abo gefunden
    // Prüfe ob gestopptes/pausiertes Abo existiert
    const pausedRecurring = recurringInvoices.find(
      (inv: any) => inv.status_id === '3' // '3' = Paused
    );

    if (pausedRecurring) {
      return {
        isActive: false,
        status: 'canceled', // Pausiert = Kein Zugriff
      };
    }

    // Kein Recurring Invoice gefunden → Status = PENDING
    return {
      isActive: false,
      status: 'pending',
    };

  } catch (error) {
    console.error('[Invoice Ninja] Status-Check fehlgeschlagen:', error);
    return {
      isActive: false,
      status: 'pending',
    };
  }
}
```

**✅ VORTEILE:**
1. Prüft **zuerst** Recurring Invoice (Abo-Status)
2. Unterscheidet zwischen "Abo existiert" und "Abo ist bezahlt"
3. Unterstützt "Trial" (Abo aktiv, erste Rechnung kommt später)
4. Klare Status-Logik für alle Edge Cases

---

## 🎯 DATENFLUSS (End-to-End)

### 1. Neuer User abonniert

```
User klickt "Plan wählen"
  → Frontend öffnet PlanSelectionModal
  → User klickt "Jetzt auswählen" (z.B. Social Media Abo)
  → iFrame lädt Invoice Ninja Payment Link
  
Invoice Ninja:
  → User gibt SEPA-Daten ein (GoCardless)
  → Erstellt Client automatisch (wenn nicht existiert)
  → Erstellt Recurring Invoice (frequency=monthly, auto_bill=always)
  → Erstellt erste Invoice
  → GoCardless zieht Betrag ein
  → Invoice wird als "paid" markiert
  
Supabase (via API):
  → /api/invoice-ninja/link-existing-client wird aufgerufen (Auto-Linking)
  → Findet Client in Invoice Ninja by Email
  → Speichert invoice_ninja_client_id in Supabase
  → checkSubscriptionStatus() gibt "active" zurück
  → Speichert status='active' in Supabase
  
Frontend:
  → useSubscription Hook erkennt Änderung (Realtime)
  → Content-Planer wird freigeschaltet
  → User hat vollen Zugriff
```

### 2. Bestehender User (z.B. dk136@hdm-stuttgart.de)

**AKTUELLER STAND:**
```
Invoice Ninja:
  ✅ Client #27 existiert
  ⚠️  KEINE Recurring Invoice (nur manuelle Payment Links)
  
Supabase:
  ⚠️  invoice_ninja_client_id: "z3YaOYpdxq"
  ❌ status: "pending"
  
Warum "pending"?
  → checkSubscriptionStatus() findet keine Recurring Invoice
  → findet auch keine bezahlte Rechnung in letzten 30 Tagen
  → Gibt "pending" zurück
```

**WAS ZU TUN IST:**
```
1. Invoice Ninja: Erstelle Recurring Invoice für Client #27
2. Supabase: Führe Force-Sync aus
3. Status wird auf "active" gesetzt
4. Content-Planer wird freigeschaltet
```

---

## 📋 SCHRITT-FÜR-SCHRITT SETUP

### Phase 1: Supabase Schema vorbereiten ✅

**Status: BEREITS ERLEDIGT**

Migrations wurden bereits ausgeführt:
- `migrations/subscriptions/migrate_to_invoice_ninja.sql`
- `migrations/referrals/migrate_to_invoice_ninja.sql`

### Phase 2: Invoice Ninja konfigurieren (DU JETZT!)

**Für JEDEN User der ein Abo haben soll:**

1. **Client prüfen/erstellen:**
   - Gehe zu Invoice Ninja → Clients
   - Prüfe ob Client existiert (nach Email suchen)
   - Falls NICHT: Wird automatisch erstellt beim ersten Payment Link Klick

2. **Recurring Invoice erstellen:**
   - Gehe zu "Recurring Invoices" → "New Recurring Invoice"
   - **Client**: Wähle den User (z.B. dk136@hdm-stuttgart.de)
   - **Frequency**: Monthly (= frequency_id: 5)
   - **Auto Bill**: Always (= GoCardless zieht automatisch ein)
   - **Line Items**:
     - Product: "Social Media Abo" (oder "Premium Abo")
     - Cost: 29.99 (oder dein Preis)
     - Quantity: 1
   - **Next Send Date**: Heute (oder Startdatum)
   - **Status**: Active (= status_id: 2)
   - Klicke "Save" und dann "Start"

3. **Payment Link erstellen (Optional - für neue User):**
   - Gehe zu "Payment Links" → "New Payment Link"
   - Verknüpfe mit Recurring Invoice
   - Kopiere Link → Setze in `.env.local`:
     ```
     NEXT_PUBLIC_PAYMENT_LINK_SOCIAL_MEDIA=https://invoice.kosmamedia.de/client/payment/xxxx
     ```

### Phase 3: Supabase Sync ausführen

**Für bestehende User die bereits in Invoice Ninja sind:**

1. **Prüfe Sync-Status:**
   ```sql
   -- In Supabase SQL Editor
   SELECT 
     s.user_id,
     p.email,
     s.status,
     s.invoice_ninja_client_id,
     s.invoice_ninja_subscription_id
   FROM subscriptions s
   LEFT JOIN auth.users p ON s.user_id = p.id
   ORDER BY s.created_at DESC;
   ```

2. **Für User dk136@hdm-stuttgart.de:**
   ```sql
   -- Wenn Recurring Invoice in Invoice Ninja existiert, setze Status:
   UPDATE subscriptions
   SET 
     status = 'active',
     last_api_sync = NOW(),
     updated_at = NOW()
   WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';
   ```

   **ODER via API:**
   ```javascript
   // In Browser Console
   fetch('/api/invoice-ninja/force-sync', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ 
       userId: '8ed7f903-a032-4bb8-adde-4248b2d3c0d2' 
     })
   })
   .then(res => res.json())
   .then(console.log);
   ```

### Phase 4: Alte Stripe-Daten bereinigen

```sql
-- Entferne alle Stripe-Daten
UPDATE subscriptions
SET 
  stripe_customer_id = NULL,
  stripe_subscription_id = NULL
WHERE stripe_customer_id IS NOT NULL;

-- Entferne alte Referral Stripe-Daten
UPDATE referrals
SET 
  stripe_coupon_id = NULL,
  stripe_promotion_code = NULL
WHERE stripe_coupon_id IS NOT NULL;
```

---

## ✅ VERIFICATION CHECKLIST

Nach Setup solltest du prüfen:

1. **Invoice Ninja:**
   - [ ] Jeder aktive User hat einen Client
   - [ ] Jeder Client hat eine aktive Recurring Invoice
   - [ ] GoCardless ist als Payment Gateway konfiguriert

2. **Supabase:**
   - [ ] Jeder User hat einen Eintrag in `subscriptions` Tabelle
   - [ ] `invoice_ninja_client_id` ist gesetzt
   - [ ] `invoice_ninja_subscription_id` ist gesetzt (wenn Recurring Invoice existiert)
   - [ ] `status` ist korrekt ('active' für zahlende Kunden)
   - [ ] KEINE `stripe_customer_id` oder `stripe_subscription_id` mehr

3. **Frontend:**
   - [ ] User mit `status='active'` haben vollen Zugriff
   - [ ] User mit `status='pending'` sehen "Content-Planer gesperrt"
   - [ ] Content-Planer zeigt korrekten Status

---

## 🔮 NÄCHSTER SCHRITT: Webhooks (Phase 2)

Aktuell: **API-Polling alle 5 Minuten**
Zukünftig: **Webhook-basierter Sync (Echtzeit)**

Siehe: `WEBHOOK_VS_POLLING_EVALUATION.md` für Details.

---

## 🆘 TROUBLESHOOTING

### Problem: Status bleibt auf "pending"

**Diagnose:**
```sql
SELECT 
  s.user_id,
  p.email,
  s.status,
  s.invoice_ninja_client_id,
  s.invoice_ninja_subscription_id,
  s.last_api_sync
FROM subscriptions s
LEFT JOIN auth.users p ON s.user_id = p.id
WHERE s.status = 'pending';
```

**Mögliche Ursachen:**
1. ❌ **Keine Recurring Invoice in Invoice Ninja**
   → Lösung: Erstelle Recurring Invoice
   
2. ❌ **Recurring Invoice ist paused/stopped**
   → Lösung: Aktiviere Recurring Invoice
   
3. ❌ **Keine bezahlte Rechnung trotz Recurring Invoice**
   → Lösung: Prüfe GoCardless Mandate, warte auf erste Rechnung

4. ❌ **Auto-Linking hat nicht funktioniert**
   → Lösung: Manuell `/api/invoice-ninja/link-existing-client` aufrufen

### Problem: Content-Planer zeigt "gesperrt" trotz Zahlung

**Diagnose:**
```javascript
// Browser Console
fetch('/api/invoice-ninja/sync-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: '<your-user-id>' })
})
.then(res => res.json())
.then(console.log);
```

**Lösung:**
1. Force-Sync via API
2. Hard Reload im Browser (Cmd+Shift+R)
3. Prüfe `last_api_sync` in Supabase

---

**Das ist die KOMPLETTE Architektur. Verstanden? Bereit für Schritt-für-Schritt Umsetzung?** 🚀

