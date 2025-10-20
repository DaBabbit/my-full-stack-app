-- Migration: Add Onboarding Fields to Users Table
-- Description: Adds firstname, lastname and onboarding_completed_at fields for user onboarding process
-- Date: 2025-01-08

-- Add new columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS firstname text NULL,
ADD COLUMN IF NOT EXISTS lastname text NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone NULL;

-- Create index for faster queries on onboarding status
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed 
ON public.users(onboarding_completed_at);

-- Comment the columns for documentation
COMMENT ON COLUMN public.users.firstname IS 'User first name collected during onboarding';
COMMENT ON COLUMN public.users.lastname IS 'User last name collected during onboarding';
COMMENT ON COLUMN public.users.onboarding_completed_at IS 'Timestamp when user completed the onboarding process';


