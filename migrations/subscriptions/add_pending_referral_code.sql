-- Add pending_referral_code column to users table
-- This field stores the referral code temporarily until the user completes email verification
-- and sets their name on the welcome page

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pending_referral_code TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.users.pending_referral_code IS 'Temporary storage for referral code during signup process, before email verification';

