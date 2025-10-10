'use client'

// 🔥 DEPRECATED: Verwende utils/supabase.ts für einheitliche Instanz
// Diese Datei wird entfernt um Auth-State-Desynchronisation zu vermeiden

import { supabase } from '../supabase';

export default () => supabase; // Re-export der einheitlichen Instanz
