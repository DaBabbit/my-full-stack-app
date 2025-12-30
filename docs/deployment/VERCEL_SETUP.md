# Vercel Setup - Environments (Production, Preview, Development)

## 🎯 Überblick

Vercel bietet **3 Environments** pro Project - keine separaten Projects nötig!

- **Production:** `main` Branch → `www.kosmamedia.de`
- **Preview:** `develop` Branch & Feature Branches → Auto-Deployments
- **Development:** Lokale Entwicklung

---

## 📦 Schritt 1: Production Branch konfigurieren

**Ein Vercel Project** ist bereits verbunden mit deinem GitHub Repository.

1. Gehe zu deinem Vercel Project → **Settings** → **Git**
2. **Production Branch:** `main` (sollte bereits so sein)
3. **Auto-Deploy:** Enabled ✅

→ Jeder Push auf `main` deployt automatisch auf Production

---

## 🌐 Schritt 2: Domain für Production hinzufügen

1. Gehe zu Project → **Settings** → **Domains**
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

## ⚙️ Schritt 3: Environment Variables konfigurieren

Vercel unterstützt **Environment-spezifische Variables**:

1. Gehe zu Project → **Settings** → **Environment Variables**

### Production Environment (für `main` Branch)

Setze folgende Variables für **Production**:

```
NEXT_PUBLIC_APP_URL = https://www.kosmamedia.de

# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL = [deine-production-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [dein-production-key]
SUPABASE_SERVICE_ROLE_KEY = [dein-production-key]

# Mixpost
MIXPOST_URL = [deine-production-url]
MIXPOST_API_TOKEN = [dein-production-token]
NEXT_PUBLIC_MIXPOST_URL = [deine-production-url]
MIXPOST_CORE_PATH = mixpost

# ... alle anderen Production-Variables
```

### Preview Environment (für `develop` & Feature Branches)

Setze die gleichen Variables für **Preview**:

```
NEXT_PUBLIC_APP_URL = https://[dein-project-name]-git-develop-[team].vercel.app

# Supabase (kannst du gleich lassen - oder separate Staging-DB nutzen)
NEXT_PUBLIC_SUPABASE_URL = [deine-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [dein-key]
SUPABASE_SERVICE_ROLE_KEY = [dein-key]

# Mixpost (gleich oder Staging-Instance)
MIXPOST_URL = [deine-url]
MIXPOST_API_TOKEN = [dein-token]
NEXT_PUBLIC_MIXPOST_URL = [deine-url]
MIXPOST_CORE_PATH = mixpost

# ... alle anderen Variables
```

### Development Environment (lokale Entwicklung)

Setze für **Development** (optional - für `vercel dev`):

```
NEXT_PUBLIC_APP_URL = http://localhost:3000
# ... lokale Development-Variables
```

**Wichtig:**
- Beim Hinzufügen einer Variable kannst du **Environment** auswählen
- ✅ Production, ✅ Preview, ✅ Development
- Oder nur für bestimmte Environments setzen

---

## 🚀 Schritt 4: Preview Deployments aktivieren

Preview Deployments sind **automatisch aktiv** für:
- Alle Branches außer `main`
- Alle Pull Requests

**Automatisch bei Push auf `develop`:**
```
git checkout develop
git push origin develop
→ Automatisches Preview-Deployment
→ URL: https://[project-name]-git-develop-[team].vercel.app
```

### Custom Domain für Preview (optional)

Falls du eine eigene Staging-Domain möchtest:

1. Settings → Domains → Add Domain
2. Domain: `staging.kosmamedia.de` (oder `preview.kosmamedia.de`)
3. Environment: **Preview** ⚠️
4. DNS-Einträge setzen

---

## 🔄 Schritt 5: Auto-Deployment prüfen

**Production:**
- Settings → Git → Production Branch: `main`
- Auto-Deploy: **Enabled** ✅

**Preview:**
- Settings → Git → Preview Deployments: **Enabled** ✅
- Automatisch für alle Branches außer `main`

---

## ✅ Checkliste

- [ ] Production Branch = `main` (Settings → Git)
- [ ] Production Domain `www.kosmamedia.de` hinzugefügt
- [ ] DNS-Einträge beim Provider gesetzt
- [ ] DNS-Propagation abgewartet (Domain aktiv)
- [ ] Environment Variables für **Production** gesetzt
- [ ] Environment Variables für **Preview** gesetzt
- [ ] Preview Deployments aktiviert (Standard)
- [ ] Auto-Deployment aktiv für Production

---

## 🎯 Environments Übersicht

| Environment | Branch | Domain | Verwendung |
|------------|--------|--------|------------|
| **Production** | `main` | `www.kosmamedia.de` | Live-Version für Kunden |
| **Preview** | `develop`, Features | Auto-generiert | Testing & Development |
| **Development** | Lokal | `localhost:3000` | Lokale Entwicklung |

---

## 🆘 Troubleshooting

### Preview Deployment wird nicht erstellt
- Prüfe: Settings → Git → Preview Deployments: **Enabled**
- Branch muss anders sein als `main`

### Environment Variables werden nicht verwendet
- Prüfe Environment-Zuordnung beim Setzen der Variable
- Variables müssen für das richtige Environment gesetzt sein
- **NEXT_PUBLIC_*** Variables müssen neu deployed werden

### Domain funktioniert nicht
- DNS-Propagation kann 5-60 Min dauern
- Prüfe DNS mit: `dig www.kosmamedia.de` oder [DNS Checker](https://dnschecker.org/)
- Vercel zeigt Status in Settings → Domains

### Preview zeigt Production-Daten
- Prüfe Environment Variables für Preview
- Stelle sicher, dass Preview eigene URLs/Keys hat (falls gewünscht)

---

## 📞 Support & Ressourcen

- **Vercel Environments:** https://vercel.com/docs/concepts/projects/environments
- **Domain Setup:** https://vercel.com/docs/concepts/projects/domains
- **Environment Variables:** https://vercel.com/docs/concepts/projects/environment-variables

---

## 💡 Vorteile dieses Setups

✅ **Ein Project** - keine Duplikation  
✅ **Automatische Preview-Deployments** für `develop`  
✅ **Environment-spezifische Configs** möglich  
✅ **Einfache Verwaltung** - alles zentral  
✅ **Kosten-effizient** - kein separates Project nötig
