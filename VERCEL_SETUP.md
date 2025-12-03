# Vercel Setup - Production & Staging

## 🎯 Ziel

- **Production:** `main` Branch → `www.kosmamedia.de`
- **Staging:** `develop` Branch → `kosmamedia-staging.vercel.app`

---

## 📦 Schritt 1: Staging Project erstellen

1. Gehe zu [Vercel Dashboard](https://vercel.com/dashboard)
2. Klicke auf **"Add New..."** → **"Project"**
3. **Import GitHub Repository:**
   - Repository: `DaBabbit/my-full-stack-app`
   - Framework Preset: **Next.js** (automatisch erkannt)
4. **Project Settings:**
   - Project Name: `kosmamedia-staging`
   - Root Directory: `./` (Standard)
   - Build Command: `npm run build` (Standard)
   - Output Directory: `.next` (Standard)
5. **Environment Variables:**
   - Kopiere alle Environment Variables vom Production Project
   - Wichtig: Gleiche Supabase, Mixpost, etc. Credentials
6. **Branch:**
   - Production Branch: `develop` ⚠️ **Wichtig!**
7. Klicke **"Deploy"**

→ Staging ist jetzt live auf: `https://kosmamedia-staging.vercel.app`

---

## 🌐 Schritt 2: Domain für Production hinzufügen

### Production Project (`main` Branch)

1. Gehe zu Production Project → **Settings** → **Domains**
2. Füge hinzu:
   - `www.kosmamedia.de`
   - `kosmamedia.de`
3. Vercel zeigt dir die **DNS-Einträge**

### DNS-Konfiguration (bei deinem Domain-Provider)

**Für `www.kosmamedia.de`:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Für `kosmamedia.de` (Root Domain):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**ODER (wenn A-Record nicht geht):**
```
Type: ALIAS
Name: @
Value: cname.vercel-dns.com
```

4. **Warte auf DNS-Propagation** (5-60 Minuten)
5. Vercel prüft automatisch und aktiviert die Domain

---

## ⚙️ Schritt 3: Environment Variables prüfen

Stelle sicher, dass **beide Projects** die gleichen Environment Variables haben:

### Production (`main`)
- `NEXT_PUBLIC_APP_URL`: `https://www.kosmamedia.de`
- Alle anderen Credentials (Supabase, Mixpost, etc.)

### Staging (`develop`)
- `NEXT_PUBLIC_APP_URL`: `https://kosmamedia-staging.vercel.app`
- Alle anderen Credentials (Supabase, Mixpost, etc.) - **GLEICH wie Production**

---

## 🔄 Schritt 4: Auto-Deployment aktivieren

Beide Projects sollten automatisch deployen:

- **Production:** Bei jedem Push auf `main` Branch
- **Staging:** Bei jedem Push auf `develop` Branch

**Prüfen:**
- Settings → Git → Auto-Deploy: **Enabled**

---

## ✅ Checkliste

- [ ] Staging Project erstellt (`develop` Branch)
- [ ] Staging Environment Variables gesetzt
- [ ] Staging läuft auf `kosmamedia-staging.vercel.app`
- [ ] Production Domain `www.kosmamedia.de` hinzugefügt
- [ ] DNS-Einträge beim Provider gesetzt
- [ ] DNS-Propagation abgewartet (Domain aktiv)
- [ ] Production Environment Variables geprüft
- [ ] Auto-Deployment aktiv für beide Projects

---

## 🆘 Troubleshooting

### Domain funktioniert nicht
- DNS-Propagation kann 5-60 Min dauern
- Prüfe DNS mit: `dig www.kosmamedia.de` oder [DNS Checker](https://dnschecker.org/)

### Staging zeigt Production-Inhalt
- Prüfe Branch-Zuordnung: Settings → Git → Production Branch = `develop`

### Environment Variables fehlen
- Settings → Environment Variables
- Für Production UND Preview/Development setzen

---

## 📞 Support

- **Vercel Docs:** https://vercel.com/docs
- **Domain Setup:** https://vercel.com/docs/concepts/projects/domains

