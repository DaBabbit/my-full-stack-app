# Development/Production Workflow

## 📋 Überblick

Dieses Projekt nutzt einen **zweigleisigen Branch-Workflow** mit **Vercel Environments** für saubere Trennung zwischen Development und Production.

- **Ein Vercel Project** mit 3 Environments (Production, Preview, Development)
- **Production:** `main` Branch → `www.kosmamedia.de`
- **Preview:** `develop` Branch → Automatische Preview-Deployments

---

## 🌿 Branches

### `main` Branch
- **Zweck:** Production/Live-Version
- **Vercel Environment:** Production
- **Domain:** `https://www.kosmamedia.de`
- **Regel:** NUR mergen wenn Features fertig und getestet sind

### `develop` Branch
- **Zweck:** Development/Staging-Version
- **Vercel Environment:** Preview
- **Domain:** Auto-generiert (z.B. `my-full-stack-app-git-develop-[team].vercel.app`)
- **Regel:** Hier wird entwickelt und getestet

---

## 🚀 Workflow

### Daily Development (auf `develop`)

```bash
# 1. Entwickeln auf develop Branch
git checkout develop

# 2. Änderungen machen, testen, committen
git add .
git commit -m "Feature: XYZ"
git push origin develop

# → Automatisches Vercel Preview-Deployment
# → Testen auf Preview-URL (siehe Vercel Dashboard)
```

**Preview-Deployment:**
- Automatisch nach jedem Push auf `develop`
- URL im Vercel Dashboard unter "Deployments"
- Nutzt Preview-Environment Variables

### Production Release (von `develop` nach `main`)

```bash
# 1. Sicherstellen, dass develop aktuell ist
git checkout develop
git pull origin develop

# 2. Wechseln zu main
git checkout main
git pull origin main

# 3. develop in main mergen
git merge develop

# 4. Auf Production pushen
git push origin main

# → Automatisches Vercel Production-Deployment
# → Live auf: www.kosmamedia.de
```

**Production-Deployment:**
- Automatisch nach jedem Push auf `main`
- Nutzt Production-Environment Variables
- Live auf `www.kosmamedia.de`

### Hotfix (wenn direkt auf Production gefixt werden muss)

```bash
# 1. Von main aus
git checkout main
git checkout -b hotfix/bug-description

# 2. Fix implementieren
git add . && git commit -m "Hotfix: ..."
git push origin hotfix/bug-description

# → Preview-Deployment für Testing

# 3. Merge in main UND develop
git checkout main
git merge hotfix/bug-description
git push origin main

git checkout develop
git merge hotfix/bug-description
git push origin develop
```

---

## ⚙️ Vercel Environments

### Production Environment
- **Branch:** `main`
- **Domain:** `www.kosmamedia.de`
- **Environment Variables:** Production-Werte
- **Auto-Deploy:** Bei Push auf `main`

### Preview Environment
- **Branch:** `develop` & alle Feature Branches
- **Domain:** Auto-generiert
- **Environment Variables:** Preview-Werte (können anders sein)
- **Auto-Deploy:** Bei Push auf alle Branches außer `main`

### Development Environment
- **Lokal:** `vercel dev`
- **Domain:** `localhost:3000`
- **Environment Variables:** Development-Werte

**Setup:** Siehe `VERCEL_SETUP.md`

---

## 📝 Best Practices

### ✅ DO's
- **Entwickle IMMER auf `develop`**
- **Teste gründlich auf Preview-Deployment vor Production Release**
- **Nutze aussagekräftige Commit-Messages**
- **Merge nur wenn Features vollständig getestet sind**
- **Prüfe Preview-Deployment im Vercel Dashboard**

### ❌ DON'Ts
- **NIEMALS direkt auf `main` committen** (außer Hotfixes)
- **Nicht mergen ohne vorheriges Testing auf Preview**
- **Keine halbfertigen Features auf Production**
- **Nicht vergessen Environment Variables zu prüfen**

---

## 🔄 Aktuelle Branch prüfen

```bash
git branch
# Aktiver Branch ist mit * markiert

git status
# Zeigt aktuellen Branch und Status
```

---

## 📊 Vercel Dashboard

**Deployments anzeigen:**
- Vercel Dashboard → Deployments
- Jedes Deployment zeigt:
  - Branch
  - Environment (Production/Preview)
  - Status
  - URL

**Preview-URL finden:**
1. Vercel Dashboard → Deployments
2. Suche Deployment von `develop` Branch
3. Klicke auf Deployment → Kopiere URL

---

## 🆘 Troubleshooting

### "Ich habe aus Versehen auf main committed"
```bash
# Änderungen zurücknehmen (OHNE zu pushen)
git reset --soft HEAD~1

# Oder zu develop verschieben
git checkout develop
git cherry-pick <commit-hash>
```

### "develop und main sind auseinander gelaufen"
```bash
# Synchronisieren
git checkout develop
git merge main  # Aktuelle Production-Änderungen holen
git push origin develop
```

### "Preview-Deployment wurde nicht erstellt"
- Prüfe Vercel Dashboard → Settings → Git → Preview Deployments: **Enabled**
- Branch muss anders sein als `main`
- Prüfe Deployment-Logs im Vercel Dashboard

### "Environment Variables werden nicht verwendet"
- Prüfe Settings → Environment Variables
- Stelle sicher, dass Variables für **Preview** Environment gesetzt sind
- **NEXT_PUBLIC_*** Variables benötigen neuen Deploy

---

## 📚 Weitere Ressourcen

- **Vercel Environments:** https://vercel.com/docs/concepts/projects/environments
- **Preview Deployments:** https://vercel.com/docs/concepts/deployments/preview-deployments
- **Git Branching:** https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging
- **Setup Guide:** Siehe `VERCEL_SETUP.md`
