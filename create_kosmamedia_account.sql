-- Erstelle einen kosmamedia-Account in Supabase
-- Dieser Account wird IMMER in allen Dropdowns verfügbar sein

-- 1. Prüfe ob der Account bereits existiert
DO $$
DECLARE
  kosmamedia_user_id UUID := '00000000-1111-2222-3333-444444444444'::UUID;
  kosmamedia_email TEXT := 'kosmamedia@kosmamedia.de';
BEGIN
  -- Prüfe ob Account existiert
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = kosmamedia_user_id) THEN
    -- Erstelle Auth User
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      confirmed_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at
    ) VALUES (
      kosmamedia_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      kosmamedia_email,
      crypt('kosmamedia_secure_password_2024', gen_salt('bf')), -- Sicheres Passwort
      now(),
      NULL,
      '',
      NULL,
      '',
      NULL,
      '',
      '',
      NULL,
      NULL,
      '{"provider":"email","providers":["email"]}',
      '{}',
      NULL,
      now(),
      now(),
      NULL,
      NULL,
      '',
      '',
      NULL,
      now(),
      '',
      0,
      NULL,
      '',
      NULL,
      false,
      NULL
    );
    
    RAISE NOTICE 'Auth user created for kosmamedia';
  ELSE
    RAISE NOTICE 'Auth user already exists for kosmamedia';
  END IF;
  
  -- Prüfe ob Public User existiert
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = kosmamedia_user_id) THEN
    -- Erstelle Public User
    INSERT INTO public.users (
      id,
      email,
      firstname,
      lastname,
      created_at,
      updated_at,
      is_deleted
    ) VALUES (
      kosmamedia_user_id,
      kosmamedia_email,
      'kosmamedia',
      '',
      now(),
      now(),
      false
    );
    
    RAISE NOTICE 'Public user created for kosmamedia';
  ELSE
    RAISE NOTICE 'Public user already exists for kosmamedia';
  END IF;
  
END $$;

-- Ausgabe zur Bestätigung
SELECT 
  'kosmamedia Account erstellt/aktualisiert:' as status,
  id,
  email,
  firstname,
  lastname
FROM public.users
WHERE email = 'kosmamedia@kosmamedia.de';

