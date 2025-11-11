# 🎯 REFERRAL-PROGRAMM TEST-PLAN

## ✅ Voraussetzungen

1. **Stripe Test-Mode** aktiv
2. **Webhook** konfiguriert in Stripe:
   - URL: `https://my-full-stack-app-alpha.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `invoice.paid`, `invoice.finalized`, `customer.updated`
3. **Environment Variables** in Vercel gesetzt:
   - `STRIPE_SECRET_KEY` (Test-Mode Key: sk_test_...)
   - `STRIPE_WEBHOOK_SECRET` (Test-Mode: whsec_...)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Test-Mode: pk_test_...)
4. **Datenbank** ist resettet (siehe `reset_for_referral_test.sql`)

---

## 🧪 TEST-ABLAUF

### **Phase 1: Referrer (User A = dk136@hdm-stuttgart.de) erstellt Referral-Link**

#### Schritt 1: Login als User A
- Gehe zu: `https://my-full-stack-app-alpha.vercel.app/login`
- Login: `dk136@hdm-stuttgart.de`
- Passwort: [dein Passwort]

#### Schritt 2: Profil aufrufen
- Gehe zu: `https://my-full-stack-app-alpha.vercel.app/profile`
- **Erwartung:** Du hast KEIN aktives Abo (Subscription wurde gelöscht)

#### Schritt 3: Eigenes Abo abschließen (OPTIONAL - nur wenn Referrer auch Abo braucht)
- Falls du willst, dass User A ein Abo hat, klicke auf Stripe Buy Button
- Testdaten: Karte `4242 4242 4242 4242`, beliebiges Datum/CVC
- **Erwartung:** Zahlung erfolgreich, Krone erscheint

#### Schritt 4: Referral-Link erstellen
- Scrolle zu "Freund empfehlen"
- Klicke auf **"Empfehlungslink erstellen"**
- **Erwartung:** Link wird angezeigt: `https://my-full-stack-app-alpha.vercel.app/signup?ref=REF-8ED7F903-XXXXXXXX`
- **Kopiere den Link!** ✅

#### Schritt 5: Prüfen in Supabase
```sql
-- In Supabase SQL Editor ausführen:
SELECT * FROM public.referrals 
WHERE referrer_user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';
```
- **Erwartung:** 1 Zeile mit `status: 'pending'`, `referred_user_id: null`

#### Schritt 6: Prüfen in Stripe Dashboard
- Gehe zu Stripe → Test-Mode → Coupons
- **Erwartung:** Neuer Coupon mit ID z.B. `ZxT7XrBt` erstellt
- Gehe zu → Promotion Codes
- **Erwartung:** Neuer Promotion Code mit ID z.B. `promo_1...` erstellt

---

### **Phase 2: Referred User (User B = neuer Test-User) registriert sich**

#### Schritt 7: Logout von User A
- Logout oder Inkognito-Tab öffnen

#### Schritt 8: Referral-Link öffnen
- **WICHTIG:** Nutze den kopierten Link aus Schritt 4!
- Öffne: `https://my-full-stack-app-alpha.vercel.app/signup?ref=REF-8ED7F903-XXXXXXXX`
- **Erwartung:** Signup-Seite wird angezeigt (nicht Login-Seite!)

#### Schritt 9: Registrierung
- Email: `test-user-b@example.com` (oder eine echte Test-Email)
- Passwort: `Test123!`
- Klicke **"Registrieren"**
- **Erwartung:** "Bitte verifiziere deine E-Mail"-Seite

#### Schritt 10: Browser Console checken (F12 → Console)
```
[SignUp] URL params ref code: REF-8ED7F903-XXXXXXXX
[SignUp] Referral code stored in localStorage: REF-8ED7F903-XXXXXXXX
[SignUp] Successfully stored referral code in DB
```
- **Erwartung:** Referral Code wurde in DB gespeichert ✅

#### Schritt 11: Email verifizieren
- Öffne Supabase → Authentication → Users
- Finde User `test-user-b@example.com`
- Klicke auf "..." → "Confirm Email"
- **ODER:** Öffne den Link aus der Email (falls echte Email)

#### Schritt 12: Auto-Login nach Verifizierung
- Nach Email-Verifizierung sollte automatisch eingeloggt werden
- **Erwartung:** Welcome-Seite mit Nachricht:
  ```
  🎉 Du wurdest durch David Kosma geworben!
  Schließe ein Abo ab, um deinem Freund 250€ Rabatt zu ermöglichen.
  ```

#### Schritt 13: Namen eingeben
- Vorname: `Test`
- Nachname: `User B`
- Klicke **"Los geht's"**
- **Erwartung:** Weiterleitung zum Dashboard

#### Schritt 14: Browser Console checken
```
[Welcome] Found referrer: David Kosma
[Welcome] Successfully claimed referral
```

#### Schritt 15: Prüfen in Supabase
```sql
SELECT * FROM public.referrals 
WHERE referrer_user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';
```
- **Erwartung:** 
  - `status: 'completed'`
  - `referred_user_id: [User B's ID]`
  - `completed_at: [aktueller Timestamp]`
  - `first_payment_received: false`
  - `rewarded_at: null`

---

### **Phase 3: Referred User (User B) schließt Abo ab**

#### Schritt 16: Als User B zum Profil
- Gehe zu: `https://my-full-stack-app-alpha.vercel.app/profile`
- **Erwartung:** Gelbe Warnung "Du hast kein aktives Abonnement"

#### Schritt 17: Abo abschließen
- Klicke auf **Stripe Buy Button**
- Stripe Checkout öffnet sich
- **Testdaten:**
  - Karte: `4242 4242 4242 4242`
  - Datum: beliebig (z.B. `12/26`)
  - CVC: beliebig (z.B. `123`)
  - PLZ: beliebig (z.B. `12345`)
- Klicke **"Abonnieren"**
- **Erwartung:** Erfolgsmeldung "Zahlung erfolgreich"

#### Schritt 18: Stripe Webhook Logs checken
- Gehe zu Vercel → Logs (oder Browser Network Tab)
- **Erwartung:** Mehrere Webhook-Events:
  ```
  ✅ Invoice finalized
  🎉 First payment detected via invoice.finalized
  🎯 Referral found! Processing reward...
  🎊 Referral reward applied!
  ```

#### Schritt 19: Prüfen in Supabase
```sql
SELECT * FROM public.referrals 
WHERE referrer_user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';
```
- **Erwartung:** 
  - `status: 'rewarded'` ✅
  - `first_payment_received: true` ✅
  - `rewarded_at: [aktueller Timestamp]` ✅

#### Schritt 20: Prüfen in Stripe Dashboard
- Gehe zu Stripe → Test-Mode → Customers
- Suche nach User A (dk136@hdm-stuttgart.de)
- Klicke auf den Customer
- Gehe zu **"Balance"** Tab
- **Erwartung:** `-€250.00` Credit angezeigt ✅

---

### **Phase 4: Referrer (User A) prüft Belohnung**

#### Schritt 21: Logout von User B, Login als User A
- Login: `dk136@hdm-stuttgart.de`

#### Schritt 22: Geworbene Freunde anzeigen
- Gehe zu: `https://my-full-stack-app-alpha.vercel.app/profile`
- Klicke auf **"Geworbene Freunde anzeigen"**
- **Erwartung:** Liste zeigt:
  - **Test User B**
  - Status: `250€ Rabatt wird bei nächster Rechnung angewendet` (grün) ✅
  - Badge: `+250,00 € Rabatt erhalten!` ✅

#### Schritt 23: Nächste Rechnung prüfen
- Falls User A ein Abo hat:
  - Die nächste Rechnung wird automatisch um 250€ reduziert
  - Z.B. 1,00€ Rechnung → 0,00€ (kostenlos!)

---

## ✅ **ERFOLGREICHER TEST!**

Wenn alle Schritte funktioniert haben:
- ✅ Referral-Link Generierung funktioniert
- ✅ Code wird korrekt gespeichert (localStorage → DB)
- ✅ Referrer-Name wird auf Welcome-Page angezeigt
- ✅ Referral wird nach Namen-Eingabe "claimed"
- ✅ First Payment wird erkannt
- ✅ 250€ Stripe Credit wird automatisch gutgeschrieben
- ✅ Status wird auf "rewarded" gesetzt
- ✅ Referrer sieht den geworbenen Freund in der Liste

---

## ❌ Troubleshooting

### Problem: Referrer-Name wird nicht angezeigt
```sql
-- Prüfe ob Referral existiert:
SELECT * FROM public.referrals WHERE referral_code = 'REF-XXXXX';
```

### Problem: Referral wird nicht auf "completed" gesetzt
```sql
-- Prüfe pending_referral_code:
SELECT id, email, pending_referral_code FROM public.users 
WHERE email = 'test-user-b@example.com';
```

### Problem: Belohnung wird nicht ausgezahlt
- Prüfe Vercel Logs → Webhook Events
- Prüfe Stripe Dashboard → Events
- Prüfe ob `invoice.paid` oder `invoice.finalized` empfangen wurde

### Problem: Stripe Credit nicht angezeigt
```bash
# Manuell in Stripe CLI (falls nötig):
stripe customers list --email dk136@hdm-stuttgart.de
stripe balance_transactions list --customer cus_XXXXX
```

---

## 🎉 VIEL ERFOLG BEIM TESTEN!

