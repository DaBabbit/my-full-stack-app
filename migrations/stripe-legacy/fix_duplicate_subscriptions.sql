-- =====================================================
-- Fix: Duplicate Subscriptions Problem
-- =====================================================
-- Der User 8ed7f903-a032-4bb8-adde-4248b2d3c0d2 hat 2 Subscription Einträge
-- Wir behalten nur den neuesten (mit stripe_subscription_id = sub_1SSK0PItXdQkyOiVBJ10CZlN)

-- 1. Schaue dir alle Subscriptions für diesen User an
SELECT * FROM public.subscriptions 
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2'
ORDER BY created_at DESC;

-- 2. Lösche die ÄLTEREN Subscriptions (behalte nur die neueste)
-- WICHTIG: Führe zuerst SELECT aus, um zu sehen welche gelöscht werden!
DELETE FROM public.subscriptions
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2'
AND stripe_subscription_id != 'sub_1SSK0PItXdQkyOiVBJ10CZlN';

-- 3. Füge UNIQUE Constraint hinzu um Future Duplicates zu verhindern
-- Drop existing constraint if exists
ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_user_id_unique;

-- Add new unique constraint
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- Erfolgsmeldung
DO $$
BEGIN
  RAISE NOTICE '✅ Duplicate Subscriptions gelöscht und UNIQUE Constraint hinzugefügt';
END $$;

