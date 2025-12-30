-- =====================================================
-- Fix: Subscription Sync Problem
-- =====================================================
-- Status in Supabase stimmt nicht mit Stripe überein
-- Abo läuft bis 11.12.2025 → sollte 'active' sein mit cancel_at_period_end: true

-- 1. Aktueller Status (zum Vergleich)
SELECT 
  id,
  stripe_subscription_id,
  status,
  cancel_at_period_end,
  current_period_end,
  updated_at
FROM public.subscriptions 
WHERE stripe_subscription_id = 'sub_1SSK0PItXdQkyOiVBJ10CZlN';

-- 2. Korrigiere den Status manuell
UPDATE public.subscriptions
SET 
  status = 'active',
  cancel_at_period_end = true,
  updated_at = NOW()
WHERE stripe_subscription_id = 'sub_1SSK0PItXdQkyOiVBJ10CZlN';

-- 3. Prüfe das Ergebnis
SELECT 
  id,
  stripe_subscription_id,
  status,
  cancel_at_period_end,
  current_period_end,
  updated_at
FROM public.subscriptions 
WHERE stripe_subscription_id = 'sub_1SSK0PItXdQkyOiVBJ10CZlN';

-- Hinweis
DO $$
BEGIN
  RAISE NOTICE '✅ Subscription status wurde korrigiert: active mit cancel_at_period_end = true';
  RAISE NOTICE 'Das Abo läuft jetzt bis 11.12.2025 und kann wiederhergestellt werden';
END $$;

