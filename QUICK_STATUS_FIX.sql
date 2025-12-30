-- ======================================
-- QUICK FIX: Status auf "active" setzen
-- ======================================
-- Für User: dk136@hdm-stuttgart.de

-- Schritt 1: Aktuellen Status prüfen
SELECT 
  user_id,
  status,
  invoice_ninja_client_id,
  current_period_end,
  created_at
FROM public.subscriptions
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';

-- Schritt 2: Status auf "active" setzen
UPDATE public.subscriptions
SET 
  status = 'active',
  last_api_sync = NOW(),
  updated_at = NOW()
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';

-- Schritt 3: Bestätigung
SELECT 
  user_id,
  status,
  updated_at
FROM public.subscriptions
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';

-- Expected: status = 'active'

-- Schritt 4: Alte Stripe-Daten bereinigen (optional)
UPDATE public.subscriptions
SET 
  stripe_customer_id = NULL,
  stripe_subscription_id = NULL
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2'
  AND stripe_customer_id IS NOT NULL;

