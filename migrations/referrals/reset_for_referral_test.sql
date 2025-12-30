-- ===================================================================
-- RESET FÜR REFERRAL-TEST
-- Löscht alle Test-Daten, behält aber User-Accounts
-- ===================================================================

-- ===================================
-- 1. Alle Referrals löschen
-- ===================================
DELETE FROM public.referrals;

-- ===================================
-- 2. Alle Subscriptions löschen (außer du willst deine behalten)
-- ===================================
-- OPTION A: Alle löschen (komplett sauberer Start)
DELETE FROM public.subscriptions;

-- OPTION B: Nur deine eigene Subscription löschen
-- DELETE FROM public.subscriptions 
-- WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';

-- ===================================
-- 3. User-Accounts NICHT löschen, nur pending_referral_code clearen
-- ===================================
UPDATE public.users 
SET pending_referral_code = NULL
WHERE pending_referral_code IS NOT NULL;

-- ===================================
-- 4. WICHTIG: In Stripe Test-Mode aufräumen
-- ===================================
-- Gehe zu Stripe Dashboard Test-Mode:
-- 1. Alle Test-Subscriptions manuell canceln
-- 2. Alle Test-Customers behalten (oder löschen wenn du willst)
-- 3. Alle Test-Coupons/Promotion Codes behalten (werden automatisch neu erstellt)

-- ===================================
-- 5. Überprüfung - sollte alles leer sein
-- ===================================
SELECT 'Referrals Count:' as info, COUNT(*) as count FROM public.referrals
UNION ALL
SELECT 'Subscriptions Count:', COUNT(*) FROM public.subscriptions
UNION ALL
SELECT 'Users with pending_referral_code:', COUNT(*) 
  FROM public.users WHERE pending_referral_code IS NOT NULL;

-- ===================================
-- FERTIG! Jetzt bist du bereit für den Test! 🎉
-- ===================================

