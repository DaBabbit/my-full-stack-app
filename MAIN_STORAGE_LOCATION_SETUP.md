# Hauptspeicherort Setup - 2 Lösungen

## ⚠️ Problem
`ERROR: 42501: must be owner of table users` bei `ALTER TABLE auth.users`

**Grund**: Die `auth.users` Tabelle in Supabase kann nicht direkt modifiziert werden.

---

## ✅ **Lösung 1: user_metadata verwenden (EMPFOHLEN - KEIN SQL NÖTIG)**

### Vorteile:
- ✅ Keine SQL-Migration erforderlich
- ✅ App liest bereits `user.user_metadata.main_storage_location`
- ✅ n8n kann direkt über Supabase Auth API schreiben
- ✅ Automatisch synchronisiert mit Auth-System

### n8n Workflow Setup:

```javascript
// In n8n Supabase Node oder HTTP Request Node
const supabaseUrl = 'https://your-project.supabase.co';
const serviceRoleKey = 'your-service-role-key'; // WICHTIG: Service Role Key!

// User aktualisieren
const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    user_metadata: {
      main_storage_location: 'https://storage.davidkosma.de/customers/kunde123/'
    }
  })
});
```

### Oder mit Supabase JS:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// User updaten
const { data, error } = await supabase.auth.admin.updateUserById(
  userId,
  { 
    user_metadata: { 
      main_storage_location: 'https://storage.davidkosma.de/customers/kunde123/'
    }
  }
);
```

### ✅ Fertig! Kein weiterer Setup nötig.

---

## ✅ **Lösung 2: public.users Tabelle verwenden**

Falls du später mehr User-Daten speichern willst (z.B. zusätzliche Felder, komplexere Queries).

### 1. SQL Migration in Supabase ausführen:

Führe den Inhalt von `add_main_storage_location_public.sql` in Supabase SQL Editor aus.

### 2. App anpassen um aus public.users zu lesen:

**Neuer Hook erstellen**: `hooks/useUserProfile.ts`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface UserProfile {
  id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  main_storage_location?: string;
  created_at: string;
  updated_at: string;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    async function loadProfile() {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
      } else {
        setProfile(data);
      }
      setIsLoading(false);
    }

    loadProfile();
  }, [user?.id]);

  return { profile, isLoading };
}
```

### 3. Dashboard anpassen:

**In `app/dashboard/page.tsx`**:

```typescript
import { useUserProfile } from '@/hooks/useUserProfile';

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, isLoading: isLoadingProfile } = useUserProfile(); // NEU
  
  // ... rest of code
  
  {/* Hauptspeicherort */}
  <div className="flex flex-col p-4 bg-neutral-800 text-white rounded-2xl border border-neutral-700">
    <div className="flex items-center mb-2">
      <FolderOpen className="w-6 h-6 mr-3 text-blue-400" />
      <span className="font-medium">Hauptspeicherort</span>
    </div>
    {profile?.main_storage_location ? (
      <p className="text-sm text-neutral-400 break-all">
        {profile.main_storage_location}
      </p>
    ) : (
      <p className="text-sm text-neutral-500 italic">Wird erstellt...</p>
    )}
  </div>
```

### 4. n8n Workflow für public.users:

```javascript
// In n8n Supabase Node
const { data, error } = await supabase
  .from('users')
  .update({ 
    main_storage_location: 'https://storage.davidkosma.de/customers/kunde123/'
  })
  .eq('id', userId);
```

---

## 🎯 **Meine Empfehlung**

**➡️ Verwende Lösung 1 (user_metadata)** für jetzt:
- Schneller Setup (kein SQL)
- App funktioniert bereits
- Perfekt für einzelne Felder

**➡️ Wechsel zu Lösung 2 (public.users)** wenn:
- Du mehr als 5-10 User-Felder brauchst
- Du komplexe Queries auf User-Daten machen willst
- Du User-Daten in Joins mit anderen Tabellen brauchst

---

## 📝 Aktueller Status

✅ **App ist bereit für Lösung 1** - nutzt bereits `user.user_metadata.main_storage_location`

❌ **SQL Migration für auth.users funktioniert nicht** - Supabase erlaubt keine direkten Änderungen

✅ **Lösung 1 braucht kein SQL** - nur n8n muss Auth API verwenden

✅ **Lösung 2 SQL bereit** - `add_main_storage_location_public.sql` kann ausgeführt werden

