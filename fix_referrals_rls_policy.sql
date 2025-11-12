-- =====================================================
-- Fix: RLS Policy für referrals Tabelle erweitern
-- =====================================================
-- User können ihre eigenen Referrals sehen (als Referrer ODER als Referred)

-- Drop alte Policy
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;

-- Neue erweiterte Policy
CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
USING (
  auth.uid() = referrer_user_id 
  OR 
  auth.uid() = referred_user_id
);

-- Erfolgsmeldung
DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policy für referrals erweitert - Users können nun ihre Referrals als Referrer UND als Referred sehen';
END $$;

