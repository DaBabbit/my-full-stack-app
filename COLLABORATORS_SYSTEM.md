# 👥 Mitbearbeiter-System (Zukünftige Erweiterung)

## 🎯 Konzept

Das Berechtigungssystem wurde bereits vorbereitet für ein zukünftiges Mitbearbeiter-System:

### 🔐 Rollen-System

#### **Owner (Besitzer)**
- Vollzugriff auf alle Funktionen
- Kann Videos erstellen, bearbeiten, löschen
- Kann Mitbearbeiter einladen und verwalten
- Benötigt aktives Abonnement

#### **Collaborator (Mitbearbeiter)**
- Kann Videos bearbeiten (Status ändern, Details aktualisieren)
- Kann keine Videos erstellen oder löschen
- Kann keine anderen Mitbearbeiter einladen
- Benötigt Einladung vom Owner

#### **Viewer (Betrachter)**
- Kann nur Videos anzeigen
- Keine Bearbeitungsmöglichkeiten
- Ideal für Kunden oder externe Stakeholder

### 🗄️ Datenbankstruktur (Vorbereitung)

```sql
-- Zukünftige Tabelle für Mitbearbeiter
CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  collaborator_email VARCHAR(255) NOT NULL,
  collaborator_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('collaborator', 'viewer')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(dashboard_owner_id, collaborator_email)
);

-- Index für bessere Performance
CREATE INDEX idx_collaborators_owner ON collaborators(dashboard_owner_id);
CREATE INDEX idx_collaborators_user ON collaborators(collaborator_user_id);
CREATE INDEX idx_collaborators_status ON collaborators(status);
```

### 🔧 Implementierung

#### **1. Permissions Hook erweitern**
```typescript
// hooks/usePermissions.ts wurde bereits vorbereitet:
// - userRole: 'owner' | 'collaborator' | 'viewer' | 'none'
// - canInviteCollaborators: boolean
// - canManageCollaborators: boolean

// Zukünftige Erweiterung:
const checkUserRole = async (userId: string, dashboardOwnerId: string) => {
  // Check if user is owner
  if (userId === dashboardOwnerId) return 'owner';
  
  // Check collaborator table
  const { data } = await supabase
    .from('collaborators')
    .select('role')
    .eq('dashboard_owner_id', dashboardOwnerId)
    .eq('collaborator_user_id', userId)
    .eq('status', 'accepted')
    .single();
    
  return data?.role || 'none';
};
```

#### **2. UI-Komponenten**
- **InviteCollaboratorModal**: Modal zum Einladen von Mitarbeitern
- **CollaboratorList**: Liste aller Mitbearbeiter verwalten
- **RoleSelector**: Rolle auswählen (collaborator/viewer)
- **PermissionIndicator**: Anzeige der aktuellen Berechtigung

#### **3. API-Endpunkte**
- `POST /api/collaborators/invite` - Mitarbeiter einladen
- `PUT /api/collaborators/[id]/role` - Rolle ändern
- `DELETE /api/collaborators/[id]` - Mitarbeiter entfernen
- `GET /api/collaborators` - Alle Mitarbeiter abrufen

### 🎨 UX-Flow

1. **Einladung senden**
   - Owner gibt E-Mail ein
   - System sendet Einladungs-E-Mail
   - Link führt zu Akzeptierung-Seite

2. **Einladung akzeptieren**
   - Mitarbeiter klickt Link
   - Falls kein Account: Registrierung
   - Automatische Zuordnung zum Dashboard

3. **Berechtigungen anzeigen**
   - Klare Anzeige der eigenen Rolle
   - Hinweise bei fehlenden Berechtigungen
   - Owner sieht alle Mitarbeiter

### 🚀 Aktivierung

Das System ist **bereits vorbereitet** und kann aktiviert werden durch:

1. Datenbank-Migration ausführen
2. `usePermissions` Hook um echte Rollen-Abfrage erweitern  
3. UI-Komponenten für Mitarbeiter-Verwaltung hinzufügen
4. API-Endpunkte implementieren

### 💡 Vorteile

- **Skalierbar**: Mehrere Mitarbeiter pro Dashboard
- **Flexibel**: Verschiedene Rollen und Berechtigungen
- **Sicher**: Explizite Berechtigungsprüfung
- **User-freundlich**: Klare Rollenanzeige

---

**Status**: 🟡 Vorbereitet - Bereit zur Implementierung
**Aufwand**: ~2-3 Tage Entwicklung
**Abhängigkeiten**: Aktuelle Permissions-Architektur ✅
