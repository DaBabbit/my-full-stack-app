-- =====================================================
-- Fix: Referrals Foreign Key zu public.users
-- =====================================================
-- Problem: referred_user_id zeigt auf auth.users, aber Query versucht public.users zu joinen
-- Lösung: FK auf public.users ändern

-- 1. Drop existing foreign key constraint
ALTER TABLE public.referrals 
DROP CONSTRAINT IF EXISTS referrals_referred_user_id_fkey;

-- 2. Add new foreign key to public.users instead of auth.users
ALTER TABLE public.referrals 
ADD CONSTRAINT referrals_referred_user_id_fkey 
FOREIGN KEY (referred_user_id) 
REFERENCES public.users(id) 
ON DELETE SET NULL;

-- Note: referrer_user_id bleibt auf auth.users weil wir nur referrer_user_id für Auth checken

-- Erfolgsmeldung
DO $$
BEGIN
  RAISE NOTICE 'Fix erfolgreich: referrals.referred_user_id zeigt jetzt auf public.users';
END $$;

