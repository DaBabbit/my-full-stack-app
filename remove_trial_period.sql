-- =====================================================
-- Remove Trial Period from System
-- =====================================================
-- Beschreibung: Entfernt Trial-Period komplett
-- Neue User bekommen kein Trial mehr, müssen sofort zahlen

-- 1. Trigger-Funktion ohne Trial updaten
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at, is_deleted)
  VALUES (NEW.id, NEW.email, NOW(), NOW(), FALSE);
  
  INSERT INTO public.user_preferences (user_id, has_completed_onboarding)
  VALUES (NEW.id, FALSE);
  
  -- Kein Trial mehr - setze Trial auf 0 Tage (sofort abgelaufen)
  INSERT INTO public.user_trials (user_id, trial_start_time, trial_end_time)
  VALUES (NEW.id, NOW(), NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Alle existierenden Trials sofort beenden
UPDATE public.user_trials 
SET trial_end_time = NOW(), is_trial_used = TRUE
WHERE trial_end_time > NOW();

-- Erfolgsmeldung
DO $$
BEGIN
  RAISE NOTICE 'Trial-Period erfolgreich entfernt';
  RAISE NOTICE 'Alle bestehenden Trials wurden beendet';
  RAISE NOTICE 'Neue User erhalten kein Trial mehr';
END $$;

