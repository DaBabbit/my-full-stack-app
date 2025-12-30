-- =====================================================
-- Fix: Referrals Status Column für Invoice Ninja
-- =====================================================
-- Problem: Status-Wert 'rewarded' existiert noch, sollte 'completed' sein
-- Datum: 2024-12-30

-- 1. Update existierende 'rewarded' zu 'completed'
UPDATE public.referrals
SET status = 'completed'
WHERE status = 'rewarded';

-- 2. Prüfe ob es eine CHECK Constraint gibt und entferne sie
DO $$
BEGIN
  ALTER TABLE public.referrals
    DROP CONSTRAINT IF EXISTS referrals_status_check;
  RAISE NOTICE 'CHECK constraint removed if existed';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'No CHECK constraint to remove';
END $$;

-- 3. Füge neue CHECK Constraint hinzu (ohne 'rewarded')
ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_status_check 
  CHECK (status IN ('pending', 'completed', 'expired'));

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Referrals Status Fix abgeschlossen';
  RAISE NOTICE 'Erlaubte Status-Werte: pending, completed, expired';
  RAISE NOTICE 'Alte "rewarded" Werte wurden zu "completed" konvertiert';
END $$;

