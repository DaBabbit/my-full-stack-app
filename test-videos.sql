-- Test-Daten für die Videos-Tabelle
-- Führen Sie diese Befehle in Ihrem Supabase SQL Editor aus

-- Ersetzen Sie USER_ID_HIER_EINSETZEN durch die echte User-ID aus Ihrer auth.users Tabelle
-- Sie finden Ihre User-ID in der Supabase Auth > Users Sektion

-- Test-Video 1: Idee
INSERT INTO public.videos (
  user_id,
  title,
  status,
  publication_date,
  responsible_person,
  storage_location,
  inspiration_source,
  description,
  last_updated
) VALUES (
  'USER_ID_HIER_EINSETZEN', -- Ersetzen Sie dies durch Ihre echte User-ID
  'Mein erstes YouTube Video',
  'Idee',
  '2024-02-15',
  'Max Mustermann',
  'https://drive.google.com/file/d/example1',
  'https://youtube.com/watch?v=inspiration1',
  'Ein spannendes Video über Content Creation und Social Media Marketing',
  now()
);

-- Test-Video 2: Warten auf Aufnahme
INSERT INTO public.videos (
  user_id,
  title,
  status,
  publication_date,
  responsible_person,
  storage_location,
  inspiration_source,
  description,
  last_updated
) VALUES (
  'USER_ID_HIER_EINSETZEN', -- Ersetzen Sie dies durch Ihre echte User-ID
  'Instagram Reel Tutorial',
  'Warten auf Aufnahme',
  '2024-02-20',
  'Anna Schmidt',
  NULL,
  'https://instagram.com/p/example2',
  'Tutorial für Instagram Reels - Wie man professionelle Videos erstellt',
  now()
);

-- Test-Video 3: In Bearbeitung (Schnitt)
INSERT INTO public.videos (
  user_id,
  title,
  status,
  publication_date,
  responsible_person,
  storage_location,
  inspiration_source,
  description,
  last_updated
) VALUES (
  'USER_ID_HIER_EINSETZEN', -- Ersetzen Sie dies durch Ihre echte User-ID
  'TikTok Dance Challenge',
  'In Bearbeitung (Schnitt)',
  '2024-02-25',
  'Lisa Weber',
  'https://dropbox.com/s/example3',
  'https://tiktok.com/@example3',
  'Trendige Dance Challenge für TikTok - Viral Potential',
  now()
);

-- Test-Video 4: Schnitt abgeschlossen
INSERT INTO public.videos (
  user_id,
  title,
  status,
  publication_date,
  responsible_person,
  storage_location,
  inspiration_source,
  description,
  last_updated
) VALUES (
  'USER_ID_HIER_EINSETZEN', -- Ersetzen Sie dies durch Ihre echte User-ID
  'Product Review Video',
  'Schnitt abgeschlossen',
  '2024-03-01',
  'Tom Müller',
  'https://onedrive.live.com/example4',
  'https://youtube.com/watch?v=review4',
  'Detaillierte Produktbewertung mit Pros und Cons',
  now()
);

-- Test-Video 5: Hochgeladen
INSERT INTO public.videos (
  user_id,
  title,
  status,
  publication_date,
  responsible_person,
  storage_location,
  inspiration_source,
  description,
  last_updated
) VALUES (
  'USER_ID_HIER_EINSETZEN', -- Ersetzen Sie dies durch Ihre echte User-ID
  'Behind the Scenes',
  'Hochgeladen',
  '2024-01-15',
  'Sarah Johnson',
  'https://vimeo.com/example5',
  'https://pinterest.com/pin/example5',
  'Behind the Scenes von unserem letzten Video-Shoot',
  now()
);

-- Anleitung zum Finden Ihrer User-ID:
-- 1. Gehen Sie zu Ihrem Supabase Dashboard
-- 2. Klicken Sie auf "Authentication" in der linken Seitenleiste
-- 3. Klicken Sie auf "Users"
-- 4. Kopieren Sie die ID des Benutzers, für den Sie Test-Daten erstellen möchten
-- 5. Ersetzen Sie 'USER_ID_HIER_EINSETZEN' in den obigen INSERT-Befehlen durch diese ID
-- 6. Führen Sie die Befehle im SQL Editor aus
