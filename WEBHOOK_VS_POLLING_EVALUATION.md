# 🔄 Webhook vs. Polling - Evaluation

## TL;DR Empfehlung

**✅ JA, Webhooks sind die bessere Lösung!**

Für Production solltest du Invoice Ninja Webhooks + Supabase Edge Functions nutzen.
Unser aktuelles API-Polling (alle 5 Min) ist ein **guter Start**, aber Webhooks sind:
- ⚡ Schneller (Echtzeit statt 5-Min-Delay)
- 💰 Günstiger (keine unnötigen API-Calls)
- 🔒 Zuverlässiger (keine verpassten Events)
- 🎯 Production-ready

---

## Vergleich: Aktuell vs. Webhook-Lösung

### Aktuelle Lösung (API-Polling)

**Wie es funktioniert:**
- `useSubscription` Hook pollt alle 5 Minuten
- Bei jedem Poll: API-Call zu Invoice Ninja
- Status-Update in Supabase bei Änderung

**Vorteile:**
- ✅ Einfach zu implementieren (bereits fertig!)
- ✅ Keine externe Infrastruktur nötig
- ✅ Funktioniert auch ohne öffentliche URL
- ✅ Gut für Development & Testing

**Nachteile:**
- ❌ **5-Minuten-Delay**: Kunde zahlt → 5 Min Wartezeit bis Freischaltung
- ❌ **Viele unnötige API-Calls**: Auch wenn sich nichts ändert
- ❌ **Nicht skalierbar**: 100 User = 100 * 12 * 24 = 28,800 API-Calls/Tag
- ❌ **Edge Cases**: User könnte genau zwischen Polls zahlen und muss warten

---

### Webhook-Lösung (Empfohlen für Production)

**Wie es funktioniert:**
1. **Invoice Ninja sendet Webhook** bei Events (Payment, Subscription Update)
2. **Supabase Edge Function empfängt** Webhook
3. **Sofortiger Update** in Supabase Subscriptions-Tabelle
4. **Realtime Update** propagiert zu Frontend (schon implementiert!)

**Vorteile:**
- ✅ **Echtzeit**: Zahlung → Sofortige Freischaltung (< 1 Sekunde)
- ✅ **Effizient**: Nur API-Calls bei tatsächlichen Änderungen
- ✅ **Skalierbar**: 100 User = ~100 Webhook-Calls/Monat (statt 28,800)
- ✅ **Zuverlässiger**: Kein Polling-Delay, keine verpassten Events
- ✅ **Production-Standard**: So machen es Stripe, Mollie, etc.

**Nachteile:**
- ❌ Etwas komplexere Setup (aber machbar!)
- ❌ Braucht öffentliche URL (Supabase Edge Function = bereits öffentlich ✅)
- ❌ Zusätzlicher Code für Webhook-Handling

---

## Empfohlene Architektur

### Phase 1: Hybrid (Jetzt → Kurzfristig)
**Was wir haben:**
- ✅ API-Polling läuft
- ✅ Frontend Realtime-Updates (Supabase Realtime)
- ✅ Alle CRUD-Operations funktionieren

**Was wir brauchen:**
- 🔧 Status manuell auf "active" setzen (SQL in Supabase)
- 🔧 ENV-Variablen für Payment Links setzen
- 🔧 Alte Stripe-Daten bereinigen

**Vorteil**: System funktioniert **jetzt**, keine Downtime

---

### Phase 2: Webhooks hinzufügen (Mittelfristig)
**Was zu tun ist:**

#### 1. Supabase Edge Function erstellen
**Pfad**: `supabase/functions/invoice-ninja-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // 1. Parse Webhook Payload
  const payload = await req.json();
  console.log('[Webhook] Received:', payload.context);

  // 2. Verify Webhook (Optional aber empfohlen)
  const accountKey = req.headers.get('x-api-secret');
  if (accountKey !== Deno.env.get('INVOICE_NINJA_ACCOUNT_KEY')) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 3. Supabase Admin Client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 4. Handle verschiedene Events
  switch (payload.context) {
    case 'recurring_purchase':
    case 'payment':
      // Payment erfolgreich → Status auf "active"
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          invoice_ninja_subscription_id: payload.subscription,
          invoice_ninja_invoice_id: payload.invoice,
          last_api_sync: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('invoice_ninja_client_id', payload.client);
      break;

    case 'subscription_cancelled':
      // Abo gekündigt → Status auf "canceled"
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          cancel_at_period_end: true,
          last_api_sync: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('invoice_ninja_client_id', payload.client);
      break;

    case 'invoice_created':
      // Neue Rechnung erstellt
      // Optional: Speichere in "invoices" Tabelle für Historie
      break;
  }

  // 5. Bestätigung an Invoice Ninja
  return new Response(
    JSON.stringify({ message: 'Success', status_code: '200' }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
});
```

#### 2. Webhook in Invoice Ninja konfigurieren
**Settings → Account Management → API Webhooks → New Webhook**

- **URL**: `https://<your-project>.supabase.co/functions/v1/invoice-ninja-webhook`
- **Events**: 
  - ✅ `recurring_purchase` (Zahlung erfolgreich)
  - ✅ `payment` (Einzel-Zahlung)
  - ✅ `subscription_cancelled` (Abo gekündigt)
  - ✅ `invoice_created` (Neue Rechnung)
- **Headers**: 
  - `Authorization`: `Bearer <SUPABASE_ANON_KEY>`

#### 3. Polling als Fallback behalten
```typescript
// In useSubscription.ts
const POLLING_INTERVAL = 60000 * 30; // Reduziere auf 30 Min (statt 5 Min)

// Polling nur als Backup:
// - Falls Webhook mal fehlschlägt
// - Falls User länger als 30 Min offline war
// - Als "Sanity Check" für Daten-Konsistenz
```

---

## Migrationsstrategie

### Option A: Big Bang (Nicht empfohlen)
- ❌ Alles auf einmal umbauen
- ❌ Risiko von Downtime
- ❌ Schwerer zu debuggen

### Option B: Inkrementell (Empfohlen)
**Woche 1: Stabilisierung**
1. ✅ Status manuell auf "active" setzen
2. ✅ ENV-Variablen setzen
3. ✅ Payment Links testen
4. ✅ Altes Stripe-Code bereinigen

**Woche 2: Webhook-Setup**
1. Supabase Edge Function erstellen & deployen
2. Webhook in Invoice Ninja konfigurieren
3. Mit Test-Kunde #27 testen
4. Logs monitoren

**Woche 3: Umstellung**
1. Polling-Interval auf 30 Min erhöhen (statt 5 Min)
2. Webhooks als primäre Sync-Methode
3. Polling als Fallback behalten
4. Monitoring für 1 Woche

**Woche 4: Cleanup**
1. Alle Stripe-Daten aus Supabase entfernen
2. Alte Stripe-Komponenten löschen
3. Dokumentation updaten

---

## Kosten-Vergleich

### Aktuell (Polling)
- **API-Calls**: ~28,800/Tag (100 User, alle 5 Min)
- **Supabase**: ~28,800 DB-Writes/Tag
- **Kosten**: Gratis bis 50k Requests/Monat (Invoice Ninja Self-Hosted)

### Mit Webhooks
- **API-Calls**: ~3,000/Monat (nur bei Events)
- **Supabase Edge Functions**: ~3,000/Monat
- **Kosten**: Deutlich günstiger + schneller

---

## Sicherheit

### Webhook-Absicherung
**3 Ebenen:**

1. **HTTPS**: Supabase Edge Functions sind HTTPS-Only ✅
2. **Secret Verification**: 
   ```typescript
   const accountKey = req.headers.get('x-api-secret');
   if (accountKey !== Deno.env.get('INVOICE_NINJA_ACCOUNT_KEY')) {
     return new Response('Unauthorized', { status: 401 });
   }
   ```
3. **IP Whitelist** (Optional): Nur Invoice Ninja Server-IP erlauben

### Replay-Attack Prevention
```typescript
// Optional: Verwende Nonce/Timestamp
const timestamp = req.headers.get('x-timestamp');
const now = Date.now();
const requestTime = new Date(timestamp).getTime();

if (now - requestTime > 5 * 60 * 1000) { // 5 Min
  return new Response('Request too old', { status: 400 });
}
```

---

## Testing-Strategie

### Webhook-Testing ohne Production-Invoice
**Mit ngrok (Local):**
```bash
# Terminal 1: Supabase Local Development
npx supabase start
npx supabase functions serve invoice-ninja-webhook

# Terminal 2: ngrok tunnel
ngrok http 54321

# Invoice Ninja Webhook URL:
https://xxxx-xxxx.ngrok.io/functions/v1/invoice-ninja-webhook
```

**Oder direkt auf Supabase Staging:**
- Deploye Edge Function zu Staging-Projekt
- Test-Webhook mit Test-Invoice
- Logs checken in Supabase Dashboard

---

## Implementation Timeline

### Sprint 1 (Diese Woche): Stabilisierung
- [ ] SQL: Status auf "active" setzen
- [ ] Vercel: ENV-Variablen setzen
- [ ] Test: Payment Links funktionieren
- [ ] Test: Content-Planer freigeschaltet

### Sprint 2 (Nächste Woche): Webhook-Prep
- [ ] Supabase: Edge Function Code schreiben
- [ ] Lokal: Mit ngrok testen
- [ ] Staging: Auf Test-Projekt deployen
- [ ] Docs: Webhook-Setup dokumentieren

### Sprint 3 (Woche danach): Production
- [ ] Supabase: Edge Function zu Production deployen
- [ ] Invoice Ninja: Webhook konfigurieren
- [ ] Monitoring: Logs für 48h beobachten
- [ ] Rollout: Polling-Interval reduzieren

---

## Empfehlung: JETZT vs. SPÄTER

### JETZT (Diese Woche)
**Fokus: System zum Laufen bringen**
1. ✅ Behalte API-Polling (funktioniert, ist stabil)
2. ✅ Fixe aktuellen User (SQL-Update)
3. ✅ Setze ENV-Variablen
4. ✅ Teste Payment Links
5. ✅ Bereinige Stripe-Code

**Warum?**
- Du brauchst ein **funktionierendes** System JETZT
- Webhooks sind ein **Nice-to-Have**, kein Blocker
- 5-Min-Delay ist akzeptabel für MVP
- Weniger Risiko, weniger Complexity

### SPÄTER (Nächste Woche+)
**Fokus: Optimization & Scale**
1. Implementiere Webhooks
2. Reduziere Polling-Interval
3. Monitoring & Analytics
4. Performance-Optimierung

**Warum?**
- System läuft stabil
- Du hast Zeit für saubere Implementation
- Kannst A/B-Testing machen (Polling vs. Webhooks)
- Kein Druck, keine Deadline

---

## Fazit

### Deine Frage: "Sollten wir Webhooks nutzen?"
**Antwort: JA, aber in 2 Phasen!**

**Phase 1 (JETZT)**: 
- ✅ API-Polling behalt
en (funktioniert!)
- ✅ System stabilisieren
- ✅ Erste Kunden onboarden

**Phase 2 (in 1-2 Wochen)**:
- ✅ Webhooks als primäre Sync-Methode
- ✅ Polling als Fallback (30 Min statt 5 Min)
- ✅ Production-ready & skalierbar

### Nächster Schritt für DICH:
1. **Jetzt sofort**: Führe `QUICK_STATUS_FIX.sql` in Supabase aus
2. **Heute**: Setze ENV-Variablen in Vercel
3. **Diese Woche**: Teste Payment Links
4. **Nächste Woche**: Wir implementieren Webhooks zusammen!

---

**Bist du einverstanden mit diesem Plan?** 🚀

