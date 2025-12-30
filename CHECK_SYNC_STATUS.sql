-- ======================================
-- SYNC-CHECK: Invoice Ninja vs. Supabase
-- ======================================

-- 1. Alle Subscriptions in Supabase anzeigen
SELECT 
  s.user_id,
  p.email,
  s.status,
  s.invoice_ninja_client_id,
  s.invoice_ninja_subscription_id,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  s.current_period_end,
  s.last_api_sync,
  s.created_at
FROM public.subscriptions s
LEFT JOIN auth.users p ON s.user_id = p.id
ORDER BY s.created_at DESC;

-- 2. Finde Subscriptions MIT Invoice Ninja Client ID
SELECT 
  COUNT(*) as mit_invoice_ninja,
  COUNT(CASE WHEN invoice_ninja_subscription_id IS NOT NULL THEN 1 END) as mit_subscription_id
FROM public.subscriptions
WHERE invoice_ninja_client_id IS NOT NULL;

-- 3. Finde Subscriptions MIT alten Stripe-Daten
SELECT 
  COUNT(*) as mit_stripe_daten
FROM public.subscriptions
WHERE stripe_customer_id IS NOT NULL 
   OR stripe_subscription_id IS NOT NULL;

-- 4. Status-Verteilung
SELECT 
  status,
  COUNT(*) as anzahl
FROM public.subscriptions
GROUP BY status
ORDER BY anzahl DESC;

-- 5. Subscriptions MIT Stripe UND Invoice Ninja (sollten migriert werden)
SELECT 
  user_id,
  status,
  stripe_customer_id IS NOT NULL as hat_stripe,
  invoice_ninja_client_id IS NOT NULL as hat_invoice_ninja,
  last_api_sync
FROM public.subscriptions
WHERE stripe_customer_id IS NOT NULL 
  AND invoice_ninja_client_id IS NOT NULL;

-- 6. Subscriptions OHNE Invoice Ninja Client ID (potentielle Probleme)
SELECT 
  s.user_id,
  p.email,
  s.status,
  s.created_at
FROM public.subscriptions s
LEFT JOIN auth.users p ON s.user_id = p.id
WHERE s.invoice_ninja_client_id IS NULL
ORDER BY s.created_at DESC;

-- ======================================
-- CLEANUP: Alte Stripe-Daten entfernen
-- ======================================

-- NUR AUSFÜHREN WENN DU SICHER BIST!
-- Kommentar entfernen um auszuführen:

/*
-- Entferne alle Stripe-Daten aus Subscriptions
UPDATE public.subscriptions
SET 
  stripe_customer_id = NULL,
  stripe_subscription_id = NULL,
  updated_at = NOW()
WHERE stripe_customer_id IS NOT NULL 
   OR stripe_subscription_id IS NOT NULL;

-- Bestätigung
SELECT 
  COUNT(*) as total,
  COUNT(stripe_customer_id) as mit_stripe_customer,
  COUNT(stripe_subscription_id) as mit_stripe_subscription
FROM public.subscriptions;
-- Sollte zeigen: mit_stripe_customer = 0, mit_stripe_subscription = 0
*/

-- ======================================
-- FIX: User dk136@hdm-stuttgart.de
-- ======================================

-- Aktueller Status von dk136@hdm-stuttgart.de
SELECT 
  user_id,
  status,
  invoice_ninja_client_id,
  stripe_customer_id,
  current_period_end,
  last_api_sync
FROM public.subscriptions
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';

-- Setze Status auf "active"
UPDATE public.subscriptions
SET 
  status = 'active',
  last_api_sync = NOW(),
  updated_at = NOW()
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';

-- Prüfe Ergebnis
SELECT 
  user_id,
  status,
  updated_at
FROM public.subscriptions
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';
-- Expected: status = 'active'

