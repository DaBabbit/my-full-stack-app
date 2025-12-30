# Setup kosmamedia Account

## 1. SQL Script in Supabase ausführen

1. Öffne **Supabase Dashboard**
2. Gehe zu **SQL Editor**
3. Führe das Script `create_kosmamedia_account.sql` aus
4. Prüfe die Ausgabe - es sollte bestätigen:
   - "Auth user created for kosmamedia" (oder "already exists")
   - "Public user created for kosmamedia" (oder "already exists")
   - Zeigt die User-Daten an

## 2. Environment Variable auf Vercel setzen

1. Öffne **Vercel Dashboard**
2. Gehe zu **Project Settings → Environment Variables**
3. Füge hinzu:
   ```
   Name: NEXT_PUBLIC_KOSMAMEDIA_USER_ID
   Value: 00000000-1111-2222-3333-444444444444
   ```
4. Speichern

## 3. Vercel neu deployen

Nach dem Setzen der Environment Variable:
```bash
vercel deploy --prod --yes
```

## 4. Testen

Nach dem Deployment sollten **ALLE 3 Dropdowns** zeigen:
1. kosmamedia (fester Account)
2. Owner (z.B. David KosmahdmAccountTest)
3. Mitarbeiter (z.B. DavidsmeuerAcc NachnamevonDavid)

## Hinweise

- **kosmamedia UUID:** `00000000-1111-2222-3333-444444444444`
- **kosmamedia E-Mail:** `kosmamedia@kosmamedia.de`
- Der Account ist ein echter Supabase-Account mit Auth User und Public User
- kosmamedia wird IMMER als erste Option in allen Dropdowns angezeigt
- Die Logik ist nun viel einfacher - direkte UUID-Abfrage statt komplexer Suche

## Troubleshooting

Falls kosmamedia nicht erscheint:
1. Prüfe Console Logs: `[useResponsiblePeople] kosmamedia Account geladen:`
2. Prüfe ob Environment Variable gesetzt ist (Vercel Settings)
3. Prüfe ob SQL Script erfolgreich ausgeführt wurde (Supabase SQL Editor)


