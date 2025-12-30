-- ===================================================================
-- SUPABASE CLEANUP UND FIX SCRIPT
-- Behebt alle Probleme mit Subscriptions und Workspace Members
-- ===================================================================

-- ===================================
-- SCHRITT 1: Alte Subscriptions aufräumen
-- ===================================

-- Lösche alle Subscriptions die nicht im Test-Mode existieren
DELETE FROM public.subscriptions 
WHERE stripe_subscription_id = 'sub_1S5tLzEsrPKmI2AXpAcOa852';

-- Lösche alle anderen alten/kaputten Subscriptions (außer der neuen Test-Subscription)
DELETE FROM public.subscriptions 
WHERE stripe_subscription_id NOT IN ('sub_1SSK0PItXdQkyOiVBJ10CZlN');

-- ===================================
-- SCHRITT 2: UNIQUE Constraints hinzufügen
-- ===================================

-- Für subscriptions Tabelle
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subscriptions_stripe_subscription_id_unique'
  ) THEN
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_stripe_subscription_id_unique 
    UNIQUE (stripe_subscription_id);
  END IF;
END $$;

-- Für workspace_members Tabelle (das fehlt und verursacht den Trigger-Fehler!)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workspace_members_workspace_owner_user_unique'
  ) THEN
    -- Lösche zuerst Duplikate falls vorhanden
    DELETE FROM public.workspace_members a
    USING public.workspace_members b
    WHERE a.id > b.id
      AND a.workspace_owner_id = b.workspace_owner_id
      AND a.user_id = b.user_id;
    
    -- Füge Constraint hinzu
    ALTER TABLE public.workspace_members 
    ADD CONSTRAINT workspace_members_workspace_owner_user_unique 
    UNIQUE (workspace_owner_id, user_id);
  END IF;
END $$;

-- ===================================
-- SCHRITT 3: Trigger prüfen und ggf. reparieren
-- ===================================

-- Zeige alle Trigger auf subscriptions Tabelle
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'subscriptions'
  AND trigger_schema = 'public';

-- ===================================
-- SCHRITT 4: Test-Subscription anlegen/aktualisieren
-- ===================================

-- Insert oder Update der neuen Test-Subscription
INSERT INTO public.subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  status,
  price_id,
  current_period_end,
  cancel_at_period_end,
  created_at,
  updated_at
)
VALUES (
  '8ed7f903-a032-4bb8-adde-4248b2d3c0d2',
  'cus_TP8GSD5RuczWhz',
  'sub_1SSK0PItXdQkyOiVBJ10CZlN',
  'active',
  'price_1SSJagItXdQkyOiVRnYUbZ9v',
  '2025-12-11 17:01:15+00',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (stripe_subscription_id) 
DO UPDATE SET
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = NOW();

-- ===================================
-- SCHRITT 5: Überprüfung
-- ===================================

-- Prüfe Subscriptions
SELECT 
  id,
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  status,
  current_period_end,
  created_at
FROM public.subscriptions
ORDER BY created_at DESC;

-- Prüfe workspace_members
SELECT 
  id,
  workspace_owner_id,
  user_id,
  role,
  status
FROM public.workspace_members
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2'
   OR workspace_owner_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';

-- Prüfe alle Constraints
SELECT 
  tc.table_name,
  tc.constraint_name, 
  tc.constraint_type,
  STRING_AGG(kcu.column_name, ', ') as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('subscriptions', 'workspace_members')
  AND tc.table_schema = 'public'
  AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
ORDER BY tc.table_name, tc.constraint_type;

-- ===================================
-- FERTIG! 🎉
-- ===================================

