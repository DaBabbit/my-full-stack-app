-- ======================================
-- QUICK FIX: Referrals Status Update
-- ======================================
-- Dieses SQL-Script in Supabase SQL Editor ausführen
-- um den 406 Error zu beheben

-- Problem: Alte Referrals haben status='rewarded', aber die App sucht nach 'completed'
-- Lösung: Alle 'rewarded' zu 'completed' ändern

UPDATE public.referrals 
SET status = 'completed' 
WHERE status = 'rewarded';

-- Prüfen ob es funktioniert hat
SELECT status, COUNT(*) as anzahl
FROM public.referrals
GROUP BY status
ORDER BY status;

-- Expected output:
-- status      | anzahl
-- ------------|-------
-- completed   | X      (alle ehemaligen 'rewarded')
-- pending     | Y      (wenn welche existieren)

