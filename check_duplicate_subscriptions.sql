-- =====================================================
-- Check: Duplicate Subscriptions für User
-- =====================================================

-- 1. Zeige alle Subscriptions für User 8ed7f903-a032-4bb8-adde-4248b2d3c0d2
SELECT 
  id,
  user_id,
  stripe_subscription_id,
  status,
  cancel_at_period_end,
  current_period_end,
  created_at,
  updated_at
FROM public.subscriptions 
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2'
ORDER BY created_at DESC;

-- 2. Zähle wie viele Subscriptions dieser User hat
SELECT 
  user_id,
  COUNT(*) as subscription_count
FROM public.subscriptions 
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2'
GROUP BY user_id;

-- 3. Zeige alle Users mit mehr als 1 Subscription
SELECT 
  user_id,
  COUNT(*) as subscription_count
FROM public.subscriptions 
GROUP BY user_id
HAVING COUNT(*) > 1;

