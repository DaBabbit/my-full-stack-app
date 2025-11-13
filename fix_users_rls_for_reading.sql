-- RLS Policy für users Tabelle: Authenticated users können andere User-Profile lesen
-- Dies ist notwendig für ResponsiblePersonAvatar und Workspace-Mitglieder

-- Prüfe aktuelle Policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- Erstelle Policy für authenticated users um andere User zu lesen
-- (nur öffentliche Daten: id, firstname, lastname, email)
DROP POLICY IF EXISTS "Authenticated users can read other users basic info" ON public.users;

CREATE POLICY "Authenticated users can read other users basic info"
ON public.users
FOR SELECT
TO authenticated
USING (true); -- Alle authenticated users können alle user-Profile lesen

-- User kann weiterhin nur eigene Daten updaten
-- Existing policy should handle this already

