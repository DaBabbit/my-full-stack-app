-- =====================================================
-- MANUELLES LINKING: Kunde #27 (dk136@hdm-stuttgart.de)
-- =====================================================
-- Client ID aus Invoice Ninja: z3YaOYpdxq
-- User ID aus Supabase: 8ed7f903-a032-4bb8-adde-4248b2d3c0d2

-- 1. Update/Insert Subscription für diesen User
INSERT INTO subscriptions (
  user_id,
  invoice_ninja_client_id,
  payment_method,
  status,
  last_api_sync,
  created_at,
  updated_at,
  cancel_at_period_end
)
VALUES (
  '8ed7f903-a032-4bb8-adde-4248b2d3c0d2',
  'z3YaOYpdxq',
  'gocardless_sepa',
  'active',
  NOW(),
  NOW(),
  NOW(),
  FALSE
)
ON CONFLICT (user_id) 
DO UPDATE SET
  invoice_ninja_client_id = 'z3YaOYpdxq',
  payment_method = 'gocardless_sepa',
  last_api_sync = NOW(),
  updated_at = NOW();

-- 2. Prüfe Ergebnis
SELECT 
  user_id,
  invoice_ninja_client_id,
  status,
  payment_method,
  created_at
FROM subscriptions
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';

