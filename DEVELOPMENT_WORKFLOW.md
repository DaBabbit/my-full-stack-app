# Development/Production Workflow

## 📋 Überblick

Dieses Projekt nutzt einen **zweigleisigen Branch-Workflow** für saubere Trennung zwischen Development und Production.

## 🌿 Branches

### `main` Branch
- **Zweck:** Production/Live-Version
- **Domain:** `https://www.kosmamedia.de` (nach Domain-Mapping)
- **Vercel:** Production Project
- **Regel:** NUR mergen wenn Features fertig und getestet sind

### `develop` Branch
- **Zweck:** Development/Staging-Version
- **Domain:** `https://kosmamedia-staging.vercel.app` (nach Vercel-Setup)
- **Vercel:** Staging Project
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

# → Automatisches Vercel Deployment auf Staging
# → Testen auf: kosmamedia-staging.vercel.app
```

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

# → Automatisches Vercel Deployment auf Production
# → Live auf: www.kosmamedia.de
```

### Hotfix (wenn direkt auf Production gefixt werden muss)

```bash
# 1. Von main aus
git checkout main
git checkout -b hotfix/bug-description

# 2. Fix implementieren
git add . && git commit -m "Hotfix: ..."
git push origin hotfix/bug-description

# 3. Merge in main UND develop
git checkout main
git merge hotfix/bug-description
git push origin main

git checkout develop
git merge hotfix/bug-description
git push origin develop
```

---

## ⚙️ Vercel Setup

### Production Project
- **Repository:** `DaBabbit/my-full-stack-app`
- **Branch:** `main`
- **Domains:** 
  - `www.kosmamedia.de`
  - `kosmamedia.de`

### Staging Project
- **Repository:** `DaBabbit/my-full-stack-app`
- **Branch:** `develop`
- **Domain:** `kosmamedia-staging.vercel.app`

**Setup in Vercel:**
1. Dashboard → "Add New..." → "Project"
2. Import GitHub Repository: `DaBabbit/my-full-stack-app`
3. Branch: `develop`
4. Project Name: `kosmamedia-staging`
5. Deploy

---

## 📝 Best Practices

### ✅ DO's
- **Entwickle IMMER auf `develop`**
- **Teste gründlich auf Staging vor Production Release**
- **Nutze aussagekräftige Commit-Messages**
- **Merge nur wenn Features vollständig getestet sind**

### ❌ DON'Ts
- **NIEMALS direkt auf `main` committen** (außer Hotfixes)
- **Nicht mergen ohne vorheriges Testing**
- **Keine halbfertigen Features auf Production**

---

## 🔄 Aktuelle Branch prüfen

```bash
git branch
# Aktiver Branch ist mit * markiert

git status
# Zeigt aktuellen Branch und Status
```

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

---

## 📚 Weitere Ressourcen

- **Vercel Docs:** https://vercel.com/docs
- **Git Branching:** https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging

