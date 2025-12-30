-- ======================================
-- FIX: User Subscription Status
-- ======================================
-- User: dk136@hdm-stuttgart.de (ID: 8ed7f903-a032-4bb8-adde-4248b2d3c0d2)
-- Problem: Status ist "pending" obwohl User in Invoice Ninja existiert

-- Schritt 1: Prüfe aktuellen Status
SELECT 
  user_id,
  status,
  invoice_ninja_client_id,
  invoice_ninja_subscription_id,
  current_period_end,
  created_at,
  last_api_sync
FROM public.subscriptions
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';

-- Schritt 2: Setze Status auf "active" (wenn User in Invoice Ninja existiert)
UPDATE public.subscriptions
SET 
  status = 'active',
  last_api_sync = NOW(),
  updated_at = NOW()
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2'
  AND status = 'pending';

-- Schritt 3: Prüfe ob Update erfolgreich war
SELECT 
  user_id,
  status,
  invoice_ninja_client_id,
  invoice_ninja_subscription_id,
  current_period_end,
  updated_at
FROM public.subscriptions
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';

-- Expected Result:
-- status sollte jetzt "active" sein
-- updated_at sollte das aktuelle Datum/Zeit zeigen

