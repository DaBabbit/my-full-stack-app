-- =====================================================
-- Enable Realtime for referrals table
-- =====================================================
-- Ermöglicht Echtzeit-Updates für die referrals Tabelle
-- sodass Änderungen am Status sofort im Frontend erscheinen

-- Realtime für referrals Tabelle aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;

-- Erfolgsmeldung
DO $$
BEGIN
  RAISE NOTICE 'Realtime für public.referrals aktiviert';
END $$;

