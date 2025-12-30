--
-- PostgreSQL database dump
--

\restrict UBeZ9WJYbyb1Cw99ikHHtjhhLkJATl1v1RUl1ays9ZzLKweSH2GoiwfDUUf14gC

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.7 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: create_workspace_owner_entry(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_workspace_owner_entry() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Insert workspace_members entry making user their own owner
  INSERT INTO public.workspace_members (
    workspace_owner_id,
    user_id,
    role,
    permissions,
    status
  ) VALUES (
    NEW.user_id,
    NEW.user_id,
    'owner',
    '{"can_view": true, "can_create": true, "can_edit": true, "can_delete": true}'::jsonb,
    'active'
  )
  ON CONFLICT (workspace_owner_id, user_id) 
  DO UPDATE SET status = 'active';
  
  RETURN NEW;
END;
$$;


--
-- Name: get_user_id_by_email(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_id_by_email(user_email text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  found_user_id UUID;
BEGIN
  -- Suche User mit dieser E-Mail
  SELECT id INTO found_user_id
  FROM public.users
  WHERE email = user_email
  LIMIT 1;
  
  -- Gib user_id zurück (oder NULL wenn nicht gefunden)
  RETURN found_user_id;
END;
$$;


--
-- Name: FUNCTION get_user_id_by_email(user_email text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_id_by_email(user_email text) IS 'Gibt die User-ID für eine E-Mail-Adresse zurück. Umgeht RLS für Einladungsfunktion.';


--
-- Name: get_workspace_owner_details(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_workspace_owner_details(owner_ids uuid[]) RETURNS TABLE(id uuid, email text, firstname text, lastname text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.firstname,
    u.lastname
  FROM
    public.users u
  WHERE
    u.id = ANY(owner_ids);
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: update_automation_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_automation_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_social_media_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_social_media_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_videos_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_videos_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Nur last_updated und updated_at setzen, KEINE anderen Aktionen
    NEW.last_updated = timezone('utc'::text, now());
    IF TG_OP = 'UPDATE' AND (TG_TABLE_NAME = 'videos') THEN
        NEW.updated_at = COALESCE(NEW.updated_at, timezone('utc'::text, now()));
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_videos_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_videos_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: automation_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation_settings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    workspace_owner_id uuid,
    auto_assign_on_idea uuid,
    auto_assign_on_waiting_for_recording uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE automation_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.automation_settings IS 'Speichert Automatisierungseinstellungen pro User/Workspace';


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_user_id uuid NOT NULL,
    referral_code text NOT NULL,
    referred_user_id uuid,
    stripe_coupon_id text,
    stripe_promotion_code text,
    status text DEFAULT 'pending'::text,
    first_payment_received boolean DEFAULT false,
    reward_amount integer DEFAULT 25000,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    rewarded_at timestamp with time zone,
    CONSTRAINT referrals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'rewarded'::text, 'expired'::text])))
);


--
-- Name: responsibility_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.responsibility_notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    recipient_user_id uuid NOT NULL,
    video_id uuid NOT NULL,
    video_title text NOT NULL,
    previous_responsible_person uuid,
    new_responsible_person uuid,
    status text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE responsibility_notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.responsibility_notifications IS 'Benachrichtigungen für Zuständigkeitswechsel bei Videos';


--
-- Name: social_media_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_media_accounts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    platform character varying(50) NOT NULL,
    mixpost_account_id character varying(255) NOT NULL,
    platform_username character varying(255),
    platform_user_id character varying(255),
    is_active boolean DEFAULT true,
    connected_at timestamp with time zone DEFAULT now(),
    last_synced timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: social_media_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_media_posts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    video_id uuid,
    user_id uuid,
    mixpost_post_id character varying(255),
    platform character varying(50) NOT NULL,
    post_url text,
    status character varying(50) DEFAULT 'scheduled'::character varying,
    caption text,
    scheduled_at timestamp with time zone,
    published_at timestamp with time zone,
    impressions integer DEFAULT 0,
    engagement integer DEFAULT 0,
    clicks integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    stripe_customer_id text,
    stripe_subscription_id text,
    status text,
    price_id text,
    created_at timestamp with time zone DEFAULT now(),
    cancel_at_period_end boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now(),
    current_period_end timestamp with time zone
);


--
-- Name: user_mixpost_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_mixpost_config (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    mixpost_workspace_id character varying(255),
    mixpost_access_token text,
    auto_publish_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    has_completed_onboarding boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: user_table_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_table_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    workspace_owner_id uuid NOT NULL,
    context text NOT NULL,
    column_order jsonb DEFAULT '[]'::jsonb NOT NULL,
    column_widths jsonb DEFAULT '{}'::jsonb NOT NULL,
    hidden_columns jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_table_settings_context_check CHECK ((context = ANY (ARRAY['own_videos'::text, 'workspace_videos'::text])))
);


--
-- Name: TABLE user_table_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_table_settings IS 'Speichert Benutzer-spezifische Tabellen-Einstellungen (Spalten-Reihenfolge, Breite, Sichtbarkeit)';


--
-- Name: COLUMN user_table_settings.context; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_table_settings.context IS 'Kontext: own_videos für eigene Videos, workspace_videos für geteilte Workspaces';


--
-- Name: COLUMN user_table_settings.column_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_table_settings.column_order IS 'Array von Spalten-IDs in gewünschter Reihenfolge';


--
-- Name: COLUMN user_table_settings.column_widths; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_table_settings.column_widths IS 'JSON-Objekt mit Spalten-Breiten in Pixeln';


--
-- Name: COLUMN user_table_settings.hidden_columns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_table_settings.hidden_columns IS 'Array von ausgeblendeten Spalten-IDs';


--
-- Name: user_trials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_trials (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    trial_start_time timestamp with time zone DEFAULT now(),
    trial_end_time timestamp with time zone NOT NULL,
    is_trial_used boolean DEFAULT false
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    reactivated_at timestamp with time zone,
    firstname text,
    lastname text,
    onboarding_completed_at timestamp with time zone,
    main_storage_location text,
    pending_referral_code text
);


--
-- Name: COLUMN users.firstname; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.firstname IS 'User first name collected during onboarding';


--
-- Name: COLUMN users.lastname; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.lastname IS 'User last name collected during onboarding';


--
-- Name: COLUMN users.onboarding_completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.onboarding_completed_at IS 'Timestamp when user completed the onboarding process';


--
-- Name: COLUMN users.main_storage_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.main_storage_location IS 'Hauptspeicherort des Kunden, wird von n8n Workflow befüllt';


--
-- Name: videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'Idee'::text NOT NULL,
    publication_date date,
    responsible_person text,
    storage_location text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    inspiration_source text,
    description text,
    duration integer,
    file_size bigint,
    format text,
    thumbnail_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_owner_id uuid,
    created_by uuid,
    nextcloud_path text,
    CONSTRAINT videos_status_check CHECK ((status = ANY (ARRAY['Warten auf Aufnahme'::text, 'Idee'::text, 'In Bearbeitung (Schnitt)'::text, 'Schnitt abgeschlossen'::text, 'Hochgeladen'::text])))
);

ALTER TABLE ONLY public.videos REPLICA IDENTITY FULL;


--
-- Name: COLUMN videos.storage_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.videos.storage_location IS 'Nextcloud folder URL for browsing uploaded files (read access)';


--
-- Name: COLUMN videos.workspace_owner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.videos.workspace_owner_id IS 'The workspace owner this video belongs to';


--
-- Name: COLUMN videos.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.videos.created_by IS 'The user who created this video';


--
-- Name: COLUMN videos.nextcloud_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.videos.nextcloud_path IS 'WebDAV path z.B. /videos/123-mein-video/';


--
-- Name: videos_backup_20251113; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.videos_backup_20251113 (
    id uuid,
    responsible_person text,
    updated_at timestamp with time zone,
    title text
);


--
-- Name: workspace_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_owner_id uuid NOT NULL,
    user_id uuid,
    role text NOT NULL,
    permissions jsonb DEFAULT '{"can_edit": false, "can_view": true, "can_create": false, "can_delete": false}'::jsonb NOT NULL,
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    invitation_token text,
    invitation_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'collaborator'::text, 'viewer'::text]))),
    CONSTRAINT workspace_members_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'removed'::text])))
);


--
-- Name: TABLE workspace_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workspace_members IS 'Manages workspace collaboration and team members';


--
-- Name: COLUMN workspace_members.workspace_owner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspace_members.workspace_owner_id IS 'The user who owns the workspace (has paid subscription)';


--
-- Name: COLUMN workspace_members.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspace_members.user_id IS 'The user who is a member of this workspace';


--
-- Name: COLUMN workspace_members.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspace_members.role IS 'Role of the member: owner, collaborator, or viewer';


--
-- Name: COLUMN workspace_members.permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspace_members.permissions IS 'JSON object with permissions: can_view, can_create, can_edit, can_delete';


--
-- Name: COLUMN workspace_members.invitation_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspace_members.invitation_token IS 'Unique token for invitation links';


--
-- Name: COLUMN workspace_members.invitation_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspace_members.invitation_email IS 'Email address where invitation was sent';


--
-- Name: workspace_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_owner_id uuid NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort_config jsonb,
    column_settings jsonb,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE workspace_views; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workspace_views IS 'Gespeicherte Ansichten für Workspaces mit Filtern und Sortierung';


--
-- Name: COLUMN workspace_views.filters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspace_views.filters IS 'JSON-Objekt mit aktiven Filtern';


--
-- Name: COLUMN workspace_views.sort_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspace_views.sort_config IS 'JSON-Objekt mit Sortier-Konfiguration';


--
-- Name: COLUMN workspace_views.column_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspace_views.column_settings IS 'Optional: View-spezifische Spalten-Einstellungen';


--
-- Data for Name: automation_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.automation_settings (id, user_id, workspace_owner_id, auto_assign_on_idea, auto_assign_on_waiting_for_recording, created_at, updated_at) FROM stdin;
e5fe7760-c7be-4855-9955-f0859098de15	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-12 17:14:48.280533+00	2025-11-23 17:59:29.194072+00
\.


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.referrals (id, referrer_user_id, referral_code, referred_user_id, stripe_coupon_id, stripe_promotion_code, status, first_payment_received, reward_amount, created_at, completed_at, rewarded_at) FROM stdin;
f5cc3cc3-d116-4b35-866f-4ac0908bfe4c	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	REF-8ED7F903-MHUS2QS5	66bdf048-58c7-4b7b-b95f-1a91492f7db3	QhYsWd7Z	promo_1SSKJMItXdQkyOiV1QcHRigW	rewarded	t	25000	2025-11-11 16:20:52.864912+00	2025-11-11 16:25:42.249+00	2025-11-12 09:24:56.774+00
6a66244f-ba90-4a67-9547-3025f37a37ac	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	REF-8ED7F903-MI6GF3LH	\N	XWHFRdnB	promo_1SVHyhItXdQkyOiVBs8ynsIt	pending	f	25000	2025-11-19 20:27:48.037066+00	\N	\N
\.


--
-- Data for Name: responsibility_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.responsibility_notifications (id, recipient_user_id, video_id, video_title, previous_responsible_person, new_responsible_person, status, message, is_read, created_at) FROM stdin;
657a9cb3-35f2-4ff0-871f-171e3f84d50c	eecb20b7-bdde-4105-9052-19ae1a3febc7	65b6051e-7b9c-49da-90fa-0f570cc3214f	filipe	\N	eecb20b7-bdde-4105-9052-19ae1a3febc7	Warten auf Aufnahme	Video "filipe" hat jetzt den Status "Warten auf Aufnahme". Du wurdest als zuständige Person zugewiesen.	f	2025-11-13 12:17:31.726596+00
0d41d97f-0360-4808-9663-5df413d51a4f	eecb20b7-bdde-4105-9052-19ae1a3febc7	da9ee534-4b91-495a-9a24-d135ba70c4cd	iphone17pro	\N	eecb20b7-bdde-4105-9052-19ae1a3febc7	Idee	Video "iphone17pro" hat jetzt den Status "Idee". Du wurdest als zuständige Person zugewiesen.	f	2025-11-13 12:42:05.117126+00
fd4b7516-677f-4359-98e6-23851a7a660c	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2c47a2e7-b890-4e3a-ba47-29505c0277cb	14 Oktober Spazieren gehen	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	66bdf048-58c7-4b7b-b95f-1a91492f7db3	Idee	Video "14 Oktober Spazieren gehen" hat jetzt den Status "Idee". Du wurdest als zuständige Person zugewiesen.	f	2025-11-17 06:26:26.793463+00
f995ec9d-3e4a-4e41-9d11-44d986cfe9f0	66bdf048-58c7-4b7b-b95f-1a91492f7db3	e585b220-dbc2-451b-8cae-57f05e39147a	Magda Test	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	66bdf048-58c7-4b7b-b95f-1a91492f7db3	Idee	Video "Magda Test" hat jetzt den Status "Idee". Du wurdest als zuständige Person zugewiesen.	f	2025-11-17 06:26:36.470223+00
e9b8a645-3d96-4058-b7d9-9446e6500b06	00000000-1111-2222-3333-444444444444	3abfb928-3524-4275-8434-0a0fdb1e6cd6	100ProzentVideo	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	00000000-1111-2222-3333-444444444444	In Bearbeitung (Schnitt)	Video "100ProzentVideo" ist nun in Bearbeitung. Du wurdest als zuständige Person zugewiesen.	f	2025-11-17 07:43:02.716454+00
c8a12098-c017-48e3-9fbb-8703ff16c103	00000000-1111-2222-3333-444444444444	afb05258-9cb8-42fe-a8e5-a78a9761b1ee	NathalieVanGogh	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	00000000-1111-2222-3333-444444444444	Warten auf Aufnahme	Video "NathalieVanGogh" hat jetzt den Status "Warten auf Aufnahme". Du wurdest als zuständige Person zugewiesen.	f	2025-11-18 21:47:25.492699+00
b6a39a6f-2633-4faf-816a-ad59d9b50747	00000000-1111-2222-3333-444444444444	4b98944a-caef-4a1a-9e99-bdd63d246015	testisiichliebe dich	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	00000000-1111-2222-3333-444444444444	Hochgeladen	Video "testisiichliebe dich" hat jetzt den Status "Hochgeladen". Du wurdest als zuständige Person zugewiesen.	f	2025-11-19 09:34:11.038405+00
45880431-c3e9-4066-a675-e007653ac08c	00000000-1111-2222-3333-444444444444	96cafc1e-043c-42f8-9615-a3444c886d4b	popup	eecb20b7-bdde-4105-9052-19ae1a3febc7	00000000-1111-2222-3333-444444444444	Schnitt abgeschlossen	Video "popup" hat jetzt den Status "Schnitt abgeschlossen". Du wurdest als zuständige Person zugewiesen.	f	2025-11-19 13:03:58.061817+00
61088937-b1db-4b69-8819-08abdf171e51	00000000-1111-2222-3333-444444444444	834bda35-3144-4f22-af00-ce9da0bb21c7	Automatischasdofh	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	00000000-1111-2222-3333-444444444444	In Bearbeitung (Schnitt)	Video "Automatischasdofh" hat jetzt den Status "In Bearbeitung (Schnitt)". Du wurdest als zuständige Person zugewiesen.	f	2025-11-21 09:45:23.526643+00
66f52022-6d78-4d12-8925-20453751a26d	00000000-1111-2222-3333-444444444444	c2764315-72c1-4d8d-8ccc-c68825a4b835	testlkjashdfiasd	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	00000000-1111-2222-3333-444444444444	In Bearbeitung (Schnitt)	Video "testlkjashdfiasd" hat jetzt den Status "In Bearbeitung (Schnitt)". Du wurdest als zuständige Person zugewiesen.	f	2025-11-21 09:45:43.228704+00
de1f4324-44d1-4875-b908-759d472d3714	00000000-1111-2222-3333-444444444444	528caac1-5e9f-44a7-b840-54e763e538d1	supbabaseasfd	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	00000000-1111-2222-3333-444444444444	Schnitt abgeschlossen	Video "supbabaseasfd" hat jetzt den Status "Schnitt abgeschlossen". Du wurdest als zuständige Person zugewiesen.	f	2025-11-21 09:45:53.243854+00
49797fbf-6ee0-49fd-849e-4af9f75ec5d6	66bdf048-58c7-4b7b-b95f-1a91492f7db3	ddafbb86-40c7-4b9d-aade-ee8e27746e24	MarcelTEstvideoamMontag	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	66bdf048-58c7-4b7b-b95f-1a91492f7db3	In Bearbeitung (Schnitt)	Video "MarcelTEstvideoamMontag" ist nun in Bearbeitung. Du wurdest als zuständige Person zugewiesen.	t	2025-11-17 07:27:14.804505+00
ce8869fa-36fe-4c58-af1a-4a8d71e05922	00000000-1111-2222-3333-444444444444	6227c01b-1636-4c23-a369-583cef41b7ad	Felipe Test Video	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	00000000-1111-2222-3333-444444444444	In Bearbeitung (Schnitt)	Video "Felipe Test Video" hat jetzt den Status "In Bearbeitung (Schnitt)". Du wurdest als zuständige Person zugewiesen.	f	2025-11-23 18:01:37.711896+00
\.


--
-- Data for Name: social_media_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.social_media_accounts (id, user_id, platform, mixpost_account_id, platform_username, platform_user_id, is_active, connected_at, last_synced, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: social_media_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.social_media_posts (id, video_id, user_id, mixpost_post_id, platform, post_url, status, caption, scheduled_at, published_at, impressions, engagement, clicks, error_message, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, status, price_id, created_at, cancel_at_period_end, updated_at, current_period_end) FROM stdin;
5318fb2f-6514-4e38-9496-d886dfdfd4c7	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	cus_TPP4nJa0jpIZgm	sub_1SSaGEItXdQkyOiVaQ7UPr1c	active	price_1SSJagItXdQkyOiVRnYUbZ9v	2025-11-12 09:22:44.804+00	f	2025-12-29 10:50:54.369+00	2026-01-12 09:22:40+00
794ae0f8-a620-4e18-bc3a-9f9b8aeba95c	66bdf048-58c7-4b7b-b95f-1a91492f7db3	cus_TP8f27VOfHfKsC	sub_1SSKNzItXdQkyOiVU9cjRPIe	active	price_1SSJagItXdQkyOiVRnYUbZ9v	2025-11-11 16:25:41.527+00	f	2025-11-22 10:18:38.058+00	2025-12-11 16:25:36+00
\.


--
-- Data for Name: user_mixpost_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_mixpost_config (id, user_id, mixpost_workspace_id, mixpost_access_token, auto_publish_enabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_preferences (id, user_id, has_completed_onboarding, created_at, updated_at) FROM stdin;
5f6f7651-1055-4876-b042-21e0db7d5b55	eecb20b7-bdde-4105-9052-19ae1a3febc7	f	2025-08-26 13:27:59.214668+00	2025-08-26 13:27:59.214668+00
0e9b67c3-b0aa-4892-a458-d68bdf9cefa7	185d79b4-c3fd-4637-85f4-3a5214efa7ee	f	2025-08-26 14:03:57.407768+00	2025-08-26 14:03:57.407768+00
7a00913e-2999-45bb-a801-a149863da870	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	f	2025-08-26 14:26:43.654238+00	2025-08-26 14:26:43.654238+00
6af14f53-e1c9-4a6d-b951-195b19578c5e	f7820782-3716-4dca-8048-b786772d1d50	f	2025-10-14 18:28:49.286994+00	2025-10-14 18:28:49.286994+00
f727320e-95a9-4991-8d82-ad8bbf330ff7	2aef73b1-4769-44ef-a746-79ca5bc7fcf6	f	2025-10-15 05:10:27.804758+00	2025-10-15 05:10:27.804758+00
aae9f703-26e3-4ddc-8f2a-4ddd36c542fd	319ca29a-5678-4a69-bbdf-43acf785ba61	f	2025-10-15 05:10:50.964829+00	2025-10-15 05:10:50.964829+00
89f9aebd-6381-4c6b-976b-4b8b4375f203	bf133861-2d34-40d7-98ea-e36ce28f6978	f	2025-11-10 14:54:46.922646+00	2025-11-10 14:54:46.922646+00
6bdb1987-cdb6-4f81-b71d-2fa2f45ef4d8	66bdf048-58c7-4b7b-b95f-1a91492f7db3	f	2025-11-11 16:23:12.607131+00	2025-11-11 16:23:12.607131+00
aa0c7df3-252f-45a9-8de8-a9a45aeadbdf	00000000-1111-2222-3333-444444444444	f	2025-11-16 11:57:23.50576+00	2025-11-16 11:57:23.50576+00
\.


--
-- Data for Name: user_table_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_table_settings (id, user_id, workspace_owner_id, context, column_order, column_widths, hidden_columns, created_at, updated_at) FROM stdin;
a9098d47-6e0c-459b-9f85-4522d8b5d019	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	own_videos	["title", "status", "publication_date", "storage_location", "description", "upload", "responsible_person", "inspiration_source", "updated_at", "actions"]	{"title": 123, "status": 265, "storage_location": 124}	["storage_location", "updated_at", "inspiration_source", "upload", "responsible_person"]	2025-10-20 16:07:23.954501+00	2025-12-29 10:40:24.129065+00
b11dbd2b-3d6e-401b-82c6-a13fa721a2ef	66bdf048-58c7-4b7b-b95f-1a91492f7db3	66bdf048-58c7-4b7b-b95f-1a91492f7db3	own_videos	[]	{"title": 207}	[]	2025-11-12 15:34:45.555615+00	2025-11-12 15:34:45.555615+00
\.


--
-- Data for Name: user_trials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_trials (id, user_id, trial_start_time, trial_end_time, is_trial_used) FROM stdin;
a195a23a-8169-4910-b179-a382f39c73aa	eecb20b7-bdde-4105-9052-19ae1a3febc7	2025-08-26 13:27:59.214668+00	2025-08-28 13:27:59.214668+00	f
9db27b23-69db-4e37-a03c-1c8adf31d278	185d79b4-c3fd-4637-85f4-3a5214efa7ee	2025-08-26 14:03:57.407768+00	2025-08-28 14:03:57.407768+00	f
bfadbf54-c76e-4d6a-a68b-88e7357d7c86	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-08-26 14:26:43.654238+00	2025-08-28 14:26:43.654238+00	f
4ac412b7-3efb-4054-88e2-350d10915cee	f7820782-3716-4dca-8048-b786772d1d50	2025-10-14 18:28:49.286994+00	2025-10-16 18:28:49.286994+00	f
afa5fd69-e306-4a30-9d22-84137c03f7c2	2aef73b1-4769-44ef-a746-79ca5bc7fcf6	2025-10-15 05:10:27.804758+00	2025-10-17 05:10:27.804758+00	f
38f17d37-3e1f-4ea0-a774-96440341e5b6	319ca29a-5678-4a69-bbdf-43acf785ba61	2025-10-15 05:10:50.964829+00	2025-10-17 05:10:50.964829+00	f
b3dfe846-d713-4a0a-b09c-1e0861ce1eba	bf133861-2d34-40d7-98ea-e36ce28f6978	2025-11-10 14:54:46.922646+00	2025-11-11 15:54:24.873895+00	t
80ef9a28-3fc7-4fef-9e3d-abdca5e16d88	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-11 16:23:12.607131+00	2025-11-11 16:23:12.607131+00	f
3907062e-8b71-48e2-9c5b-dc0cdf427dc5	00000000-1111-2222-3333-444444444444	2025-11-16 11:57:23.50576+00	2025-11-16 11:57:23.50576+00	f
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, created_at, updated_at, is_deleted, deleted_at, reactivated_at, firstname, lastname, onboarding_completed_at, main_storage_location, pending_referral_code) FROM stdin;
185d79b4-c3fd-4637-85f4-3a5214efa7ee	karate_gestarrt.15@icloud.com	2025-08-26 14:03:57.407768+00	2025-08-26 14:03:57.407768+00	f	\N	\N	\N	\N	\N	\N	\N
66bdf048-58c7-4b7b-b95f-1a91492f7db3	david.kosma@kosmamedia.de	2025-11-11 16:23:12.607131+00	2025-11-11 16:23:52.882+00	f	\N	\N	DavidsmeuerAcc	NachnamevonDavid	2025-11-11 16:23:52.882+00	https://storage.davidkosma.de/index.php/s/gZPrSCeXkyXXxd6	\N
00000000-1111-2222-3333-444444444444	kosmamedia@kosmamedia.de	2025-11-16 11:57:23.50576+00	2025-11-16 11:58:22.252072+00	f	\N	\N	kosmamedia	\N	\N	\N	\N
f7820782-3716-4dca-8048-b786772d1d50	maurice.kosma@gmail.com	2025-10-14 18:28:49.286994+00	2025-10-14 18:28:49.286994+00	f	\N	\N	\N	\N	\N	\N	\N
2aef73b1-4769-44ef-a746-79ca5bc7fcf6	maurikosma@gmail.com	2025-10-15 05:10:27.804758+00	2025-10-15 05:10:27.804758+00	f	\N	\N	\N	\N	\N	\N	\N
319ca29a-5678-4a69-bbdf-43acf785ba61	mauricekosma@icloud.com	2025-10-15 05:10:50.964829+00	2025-10-15 05:11:24.565+00	f	\N	\N	Maurice	Kosma	2025-10-15 05:11:24.565+00	https://storage.davidkosma.de/index.php/s/a3PHBkTHyDs6gby	\N
eecb20b7-bdde-4105-9052-19ae1a3febc7	david.kosma@outlook.com	2025-08-26 13:27:59.214668+00	2025-10-08 10:15:49.403+00	f	\N	\N	Peter	OulokAccountNachname	2025-10-08 10:15:49.403+00	https://storage.davidkosma.de/index.php/s/eGBnsp37HQ9m9Jd	\N
8ed7f903-a032-4bb8-adde-4248b2d3c0d2	dk136@hdm-stuttgart.de	2025-08-26 14:26:43.654238+00	2025-10-08 10:11:17.543+00	f	\N	\N	David	KosmahdmAccountTest	2025-10-08 10:11:17.543+00	https://storage.davidkosma.de/index.php/s/jZ3ZgQAcB9tLwQR	\N
bf133861-2d34-40d7-98ea-e36ce28f6978	davidkosma26@gmail.com	2025-11-10 14:54:46.922646+00	2025-11-10 14:55:43.221+00	f	\N	\N	ManslekTestAcc	popup	2025-11-10 14:55:43.221+00	https://storage.davidkosma.de/index.php/s/s8kaJE3wq8CPxKs	\N
\.


--
-- Data for Name: videos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.videos (id, user_id, title, status, publication_date, responsible_person, storage_location, last_updated, inspiration_source, description, duration, file_size, format, thumbnail_url, created_at, updated_at, workspace_owner_id, created_by, nextcloud_path) FROM stdin;
44c17145-37b6-4dd7-9e74-505711a766ef	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	asdfasdf3	Warten auf Aufnahme	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/zFeoTgWwGsLjH9o	2025-11-12 17:15:38+00	\N	\N	\N	\N	\N	\N	2025-11-11 12:18:03.576785+00	2025-11-13 11:39:46.34791+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/asdfasdf3
14f3820b-d615-4a93-9393-b6dbf20b0a68	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Vorheriger	Warten auf Aufnahme	2025-10-01	eecb20b7-bdde-4105-9052-19ae1a3febc7	https://storage.davidkosma.de/index.php/s/g9MXTStTizGp9mq	2025-11-13 12:17:16.546+00	\N	Kj	\N	\N	\N	\N	2025-10-12 21:58:53.961267+00	2025-11-13 12:43:18.3644+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/vorheriger
3abfb928-3524-4275-8434-0a0fdb1e6cd6	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	100ProzentVideo	In Bearbeitung (Schnitt)	\N	00000000-1111-2222-3333-444444444444	https://storage.davidkosma.de/index.php/s/mPi7Q7pXbJdM9Hj	2025-11-17 07:43:02.035+00	\N	\N	\N	\N	\N	\N	2025-11-17 07:04:18.688832+00	2025-11-17 12:12:11.316618+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/03_Status_In Bearbeitung/100prozentvideo
65b6051e-7b9c-49da-90fa-0f570cc3214f	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	filipe	Warten auf Aufnahme	2025-11-06	eecb20b7-bdde-4105-9052-19ae1a3febc7	https://storage.davidkosma.de/index.php/s/AmoQaGCg3q3Jncy	2025-11-13 12:17:31.131+00	\N	\N	\N	\N	\N	\N	2025-10-27 13:56:22.635327+00	2025-11-13 12:43:18.468426+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/filipe
96cafc1e-043c-42f8-9615-a3444c886d4b	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	popup	Schnitt abgeschlossen	2025-10-01	00000000-1111-2222-3333-444444444444	https://storage.davidkosma.de/index.php/s/5LECW8TNLx3pyaZ	2025-11-19 13:03:57.803+00	\N	Peter	\N	\N	\N	\N	2025-10-12 14:49:40.555532+00	2025-11-19 13:03:57.902089+00	\N	\N	\N
47b5b3ff-3ef1-4cd8-a31d-07479f0e95b6	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	asefqef	Warten auf Aufnahme	2025-10-01	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/zCi6MWGbanSpBrM	2025-11-13 12:39:03.206+00	\N	das ist anders	\N	\N	\N	\N	2025-10-12 14:57:59.38251+00	2025-11-13 12:43:18.640928+00	\N	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/asefqef
12ab53d5-0094-4eb5-8ad5-45d793f0192e	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Peterpanasdf	Warten auf Aufnahme	2025-10-01	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/2i93aFMamZG4Hye	2025-11-13 12:40:52.332+00	www.de.de	test	\N	\N	\N	\N	2025-09-06 18:58:37.682423+00	2025-11-13 12:43:18.740038+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/peterpanasdf
fc38de00-84ef-4b29-a270-67c1959bde26	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	donnerstag 23	Hochgeladen	2025-12-07	\N	https://storage.davidkosma.de/index.php/s/ozXNsiyQN6reCnY	2025-11-08 14:53:17.543+00	\N	äfpoasdf	\N	\N	\N	\N	2025-10-23 09:01:31.047844+00	2025-11-08 14:53:17.707256+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/donnerstag_23
50a39e18-87ca-4d94-b327-828c49c92709	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	istesvideobezogen	Idee	2025-11-22	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/W8DRbPFAP7MmPZ3	2025-11-18 21:47:59.009+00	\N	\N	\N	\N	\N	\N	2025-11-13 14:34:17.502526+00	2025-11-18 21:47:59.082146+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/istesvideobezogen
4af25748-a920-45bb-b23d-61b11146f317	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	dokt	Warten auf Aufnahme	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/XHDMk5E9yrx8Emf	2025-11-13 12:41:06.513+00	\N	\N	\N	\N	\N	\N	2025-11-11 12:12:15.28935+00	2025-11-13 12:43:18.831232+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/dokt
0ad47849-d794-49af-bf46-28085044c52c	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	n8nTestpublia	Warten auf Aufnahme	2025-10-14	eecb20b7-bdde-4105-9052-19ae1a3febc7	https://storage.davidkosma.de/index.php/s/a8qa62yWLPDLNzN	2025-11-13 12:41:46.055+00	\N	asdf	\N	\N	\N	\N	2025-10-18 18:43:49.650448+00	2025-11-13 12:43:18.903211+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/n8ntestpublia
1d9da55b-4f96-47ef-92e0-b90d01c66132	319ca29a-5678-4a69-bbdf-43acf785ba61	Probe	Idee	2025-10-16	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/yH8w93HXRyfjrfN	2025-10-15 05:15:23.36666+00	https://youtube.com/shorts/RGOex_6Y74k?si=GWd0LgTdAooFPTK8	Nur zum ausprobieren 	\N	\N	\N	\N	2025-10-15 05:15:23.36666+00	2025-11-13 13:28:09.398322+00	319ca29a-5678-4a69-bbdf-43acf785ba61	\N	data/kosmamedia/maurice_kosma/01_Status_Idee/probe
0b5e4e01-3ed1-44df-b8a2-d49e27d9cbe9	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	asdfe	Schnitt abgeschlossen	2025-10-01	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/nmjJzaJdLkGKEt5	2025-10-18 20:26:48.189+00	\N	Peter	\N	\N	\N	\N	2025-10-12 14:56:22.334409+00	2025-11-13 13:28:09.398322+00	\N	\N	\N
da9ee534-4b91-495a-9a24-d135ba70c4cd	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	iphone17pro	Warten auf Aufnahme	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/4GtEtedmMLLNiSH	2025-11-19 12:48:37.921+00	\N	\N	\N	\N	\N	\N	2025-10-23 12:20:03.019128+00	2025-11-19 20:24:49.794474+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/iphone17pro
3cf2cc9f-55a2-4a10-9a26-235286b19c96	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Mori ist süß	Idee	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/grqLiP3MdeKBkSM	2025-12-29 10:41:45.571686+00	\N	\N	\N	\N	\N	\N	2025-12-29 10:40:57.940307+00	2025-12-29 10:40:57.940307+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/mori_ist_süß
4b98944a-caef-4a1a-9e99-bdd63d246015	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	testisiichliebe dich	Hochgeladen	2025-10-15	00000000-1111-2222-3333-444444444444	https://storage.davidkosma.de/index.php/s/yymqzoSQtMATyH5	2025-11-19 09:42:40.622+00	\N	<3	\N	\N	\N	\N	2025-10-19 14:50:23.909278+00	2025-11-19 09:42:40.725561+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/05_Status_Hochgeladen/testisiichliebe_dich
34fb810c-8442-444f-b2eb-87fe9b713f5e	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	OktoberLessiamtelefon	Idee	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/spRJ2LkSypzfc28	2025-11-21 10:42:30.896735+00	\N	\N	\N	\N	\N	\N	2025-10-23 10:02:49.801621+00	2025-10-25 09:03:00.469733+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/oktoberlessiamtelefon
21d31855-cb97-42c0-a39b-72e4385e1156	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Testpeter	Schnitt abgeschlossen	2025-10-01	eecb20b7-bdde-4105-9052-19ae1a3febc7	https://storage.davidkosma.de/index.php/s/3B5F7CQ2sFzJ3GE	2025-10-18 08:38:48.693+00	https://pock.de	\N	\N	\N	\N	\N	2025-09-06 18:57:30.509835+00	2025-11-13 13:53:31.242609+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N
528caac1-5e9f-44a7-b840-54e763e538d1	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	supbabaseasfd	Idee	\N	00000000-1111-2222-3333-444444444444	https://storage.davidkosma.de/index.php/s/bFseSHBCsp38RB5	2025-12-29 10:41:58.624881+00	\N	\N	\N	\N	\N	\N	2025-11-19 09:54:31.85392+00	2025-11-19 09:58:16.219428+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/supbabaseasfd
5e4fa1a1-5a54-4372-a878-653ee1cdfd4c	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Easy ich liebe dich über alles	Idee	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/BJ4bSQCMBpkZEam	2025-12-29 10:41:45.477936+00	\N	\N	\N	\N	\N	\N	2025-11-19 20:23:55.308065+00	2025-11-21 09:28:14.727055+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/easy_ich_liebe_dich_über_alles
d5f9f056-4ee5-496b-b9a7-fb6db417ae49	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	wird es angezeigt	Hochgeladen	2025-10-15	eecb20b7-bdde-4105-9052-19ae1a3febc7	https://storage.davidkosma.de/index.php/s/9LNyMNraRgkknDc	2025-10-23 08:37:03.829+00	fgh	iPhone 	\N	\N	\N	\N	2025-10-14 15:56:34.835454+00	2025-11-13 13:53:31.242609+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/05_Status_Hochgeladen/wird_es_angezeigt
a9af6fbc-7969-465d-9e67-b619d55ba595	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	donnerstag	Schnitt abgeschlossen	2025-11-23	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/BqmqXfBpyjLLmm8	2025-11-10 18:15:10.321+00	\N	\N	\N	\N	\N	\N	2025-10-23 09:00:50.532753+00	2025-11-13 13:53:31.242609+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/04_Status_Schnitt_Abgeschlossen/donnerstag
ae174cb3-6cae-4a95-8d68-936e792380dc	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	peterpan Video	Schnitt abgeschlossen	2025-10-01	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/f49zP9ZZ2QF4EPa	2025-10-18 08:38:48.693+00	asdfasdf	asdf	\N	\N	\N	\N	2025-10-12 12:13:17.364066+00	2025-11-13 13:53:31.242609+00	\N	\N	\N
71d98d6d-4c1e-4253-b744-210b7d7b54e5	eecb20b7-bdde-4105-9052-19ae1a3febc7	Testvideo otlook account	Idee	\N	\N	https://storage.davidkosma.de/index.php/s/4s8aFECFWnFE5m7	2025-10-08 10:07:19.473586+00	\N	\N	\N	\N	\N	\N	2025-10-08 10:07:19.473586+00	2025-10-23 09:25:11.238067+00	eecb20b7-bdde-4105-9052-19ae1a3febc7	eecb20b7-bdde-4105-9052-19ae1a3febc7	data/kosmamedia/peter_oulokaccountnachname/01_Status_Idee/testvideo_otlook_account
671bcce6-fac6-4d71-9783-530032632169	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	testwebhook	Warten auf Aufnahme	2025-10-30	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/nboAcFtcfFqDgR2	2025-10-21 09:21:09.718+00	test	\N	\N	\N	\N	\N	2025-10-12 14:46:57.456656+00	2025-11-13 13:28:09.398322+00	\N	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/testwebhook
bc20590a-42f3-43ee-807d-d0e1f1a45d5b	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	anmachnechen tag	Warten auf Aufnahme	2025-11-12	\N	https://storage.davidkosma.de/index.php/s/8y4mGweTYp8dXbj	2025-11-08 14:52:53.805+00	\N	tet	\N	\N	\N	\N	2025-10-23 09:12:33.879021+00	2025-11-08 14:52:53.864314+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/anmachnechen_tag
4516d787-2667-4c93-9a49-a9fb5ecb89e5	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Peterpan	Schnitt abgeschlossen	2025-10-01	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/9q4L79LAKbi4yeC	2025-10-18 08:38:48.693+00	https://peter.de	\N	\N	\N	\N	\N	2025-09-06 18:54:43.049947+00	2025-11-13 13:28:09.398322+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N
f74a401b-994c-433b-bdb2-ff5acf27ec1c	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	webhookgetreqeu	Schnitt abgeschlossen	2025-10-15	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/A24k3Ac7SyeH77H	2025-10-21 09:21:15.767+00	uzt	Das ist ein test	\N	\N	\N	\N	2025-10-12 14:47:50.348133+00	2025-11-13 13:28:09.398322+00	\N	\N	\N
8a588851-0d6c-4f51-98af-d3f756a681d0	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Video 01 - Das ist der Anfang einer neuen Serie	Schnitt abgeschlossen	2025-10-01	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/QT2MbYpgCN6ne43	2025-10-21 13:06:53.973+00	www.yt.de	Peter Pan 	\N	\N	\N	\N	2025-09-10 19:17:27.575552+00	2025-11-13 13:28:09.398322+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N
3c3de436-c266-4819-bc57-871d33140ca2	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	patrickofeibel	Hochgeladen	\N	00000000-1111-2222-3333-444444444444	https://storage.davidkosma.de/index.php/s/t3iNNnjsqkkaLkr	2025-11-19 12:54:22.577+00	\N	\N	\N	\N	\N	\N	2025-11-11 12:24:39.39279+00	2025-11-19 12:54:22.638956+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/05_Status_Hochgeladen/patrickofeibel
0307b871-f3be-45f2-8da2-9a0fa2f400d0	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	DasisteinTestamDonnerstag	Idee	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/nfHRLNe9de28qGB	2025-11-19 13:05:21.838+00	\N	\N	\N	\N	\N	\N	2025-10-23 09:40:52.146552+00	2025-11-19 13:05:21.907572+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/dasisteintestamdonnerstag
696333bc-61dd-49ee-93c3-132771762d16	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	testnataschapodcast	Warten auf Aufnahme	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/8te7xCQyoyN3xfY	2025-11-17 06:27:00.923+00	\N	\N	\N	\N	\N	\N	2025-11-12 12:51:29.684+00	2025-11-17 06:27:00.985142+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/testnataschapodcast
59025f04-6751-4e08-9c59-8fa46b0cc31d	66bdf048-58c7-4b7b-b95f-1a91492f7db3	asdfasfe	Hochgeladen	\N	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/DoowBRdPtYQB7mi	2025-11-12 15:07:52.887+00	\N	\N	\N	\N	\N	\N	2025-11-12 14:49:40.461625+00	2025-11-12 15:08:47.433398+00	66bdf048-58c7-4b7b-b95f-1a91492f7db3	\N	data/kosmamedia/davidsmeueracc_nachnamevondavid/05_Status_Hochgeladen/asdfasfe
07a6d047-6d03-4641-80eb-89a76e3a29a6	66bdf048-58c7-4b7b-b95f-1a91492f7db3	sdfg	In Bearbeitung (Schnitt)	\N	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/4sDLKHbozyAijnP	2025-11-12 15:25:04.282+00	\N	\N	\N	\N	\N	\N	2025-11-12 12:34:54.312206+00	2025-11-12 15:25:35.196457+00	66bdf048-58c7-4b7b-b95f-1a91492f7db3	\N	data/kosmamedia/davidsmeueracc_nachnamevondavid/03_Status_In Bearbeitung/sdfg
cf6bc43e-383b-4f2b-abba-7a917c2f1c46	66bdf048-58c7-4b7b-b95f-1a91492f7db3	cäribrauchtdecke	In Bearbeitung (Schnitt)	\N	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/iDniRB6rsMLBGZi	2025-12-29 10:41:16.940611+00	\N	\N	\N	\N	\N	\N	2025-11-12 15:44:55.667618+00	2025-11-19 20:24:13.955063+00	66bdf048-58c7-4b7b-b95f-1a91492f7db3	\N	data/kosmamedia/davidsmeueracc_nachnamevondavid/03_Status_In Bearbeitung/cäribrauchtdecke
fa50a009-0df4-46f8-800d-85a22a27fd56	66bdf048-58c7-4b7b-b95f-1a91492f7db3	Vadimbekommtiberio	In Bearbeitung (Schnitt)	\N	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/PjFN2wCbppmBjSZ	2025-11-12 15:33:38.988+00	\N	\N	\N	\N	\N	\N	2025-11-12 13:09:30.143902+00	2025-11-12 15:34:10.013614+00	66bdf048-58c7-4b7b-b95f-1a91492f7db3	\N	data/kosmamedia/davidsmeueracc_nachnamevondavid/03_Status_In Bearbeitung/vadimbekommtiberio
834bda35-3144-4f22-af00-ce9da0bb21c7	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Automatischasdofh	In Bearbeitung (Schnitt)	2025-11-30	00000000-1111-2222-3333-444444444444	https://storage.davidkosma.de/index.php/s/sJgD6TkGHRY8YzQ	2025-11-21 10:42:34.67286+00	\N	\N	\N	\N	\N	\N	2025-11-13 12:42:20.962069+00	2025-11-18 21:48:16.363797+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/03_Status_In Bearbeitung/automatischasdofh
ef734496-b4d3-4e56-bcf3-5f674708b3c7	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Mein Video am Do Nextcloud	Idee	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/4ZNjk8WSE6sYKdS	2025-11-23 18:03:09.462824+00	\N	\N	\N	\N	\N	\N	2025-11-21 10:41:32.966159+00	2025-11-21 10:41:32.966159+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/mein_video_am_do_nextcloud
4cd83d66-e88d-4982-9643-3f2af9fa9a2b	66bdf048-58c7-4b7b-b95f-1a91492f7db3	testappmit	In Bearbeitung (Schnitt)	\N	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/4Z5YAGmDXC6ERXt	2025-11-12 16:04:18.461+00	\N	\N	\N	\N	\N	\N	2025-11-12 15:59:58.358333+00	2025-11-12 16:11:36.264303+00	66bdf048-58c7-4b7b-b95f-1a91492f7db3	\N	data/kosmamedia/davidsmeueracc_nachnamevondavid/03_Status_In Bearbeitung/testappmit
ddafbb86-40c7-4b9d-aade-ee8e27746e24	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	MarcelTEstvideoamMontag	Idee	\N	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/FZ8BHHCwjPjA95H	2025-12-29 10:41:58.695896+00	\N	\N	\N	\N	\N	\N	2025-11-17 07:25:41.173476+00	2025-11-17 12:12:11.409278+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/marceltestvideoammontag
e3607779-5578-48e4-9447-1e551a285120	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	fdgadf	Warten auf Aufnahme	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/HbJtseHNxRk49qC	2025-11-12 17:15:10.107+00	\N	\N	\N	\N	\N	\N	2025-11-11 12:19:13.791579+00	2025-11-13 11:39:46.423276+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/fdgadf
24d467e4-d3aa-495b-8518-d96a58326518	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	zweitertestamdienstag	Warten auf Aufnahme	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/zE4qFbN7m7CtFQt	2025-11-12 17:28:50.793+00	\N	\N	\N	\N	\N	\N	2025-11-11 11:02:34.097477+00	2025-11-13 11:39:46.535625+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/zweitertestamdienstag
2c47a2e7-b890-4e3a-ba47-29505c0277cb	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	14 Oktober Spazieren gehen	Idee	2025-10-01	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/QockGf2NKHqfmrB	2025-11-18 21:47:08.793+00	\N	j	\N	\N	\N	\N	2025-10-14 07:25:01.247116+00	2025-11-18 21:47:09.037621+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/14_oktober_spazieren_gehen
d078544f-600a-4b62-8753-38b0398d711f	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	euz	Warten auf Aufnahme	2025-11-18	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/sNSdjZfCGRJqrda	2025-11-18 21:47:42.823+00	\N	\N	\N	\N	\N	\N	2025-11-15 18:22:53.537691+00	2025-11-19 09:55:21.883071+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/euz
61ec3891-9b71-4dec-a346-3bf7b2a46d4d	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	topvideo	Warten auf Aufnahme	\N	\N	https://storage.davidkosma.de/index.php/s/eLXTQMg2cJLrZJM	2025-10-23 12:17:44.381+00	\N	\N	\N	\N	\N	\N	2025-10-23 09:05:00.197819+00	2025-10-23 12:17:44.885359+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/topvideo
ffccda99-3faf-4d01-8b72-851b48124272	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	poppasdf	Idee	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/AagSyLacFKpz7SZ	2025-11-19 12:53:22.674+00	\N	\N	\N	\N	\N	\N	2025-11-11 12:24:27.474388+00	2025-11-19 12:53:22.735044+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/poppasdf
090f12c1-389b-4fb2-b99f-404a276363b3	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Davidstestam Samstag	Warten auf Aufnahme	2025-11-04	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/grnmmoxjFALQoDg	2025-11-19 12:48:14.529+00	\N	\N	\N	\N	\N	\N	2025-10-25 10:08:17.353749+00	2025-11-19 20:24:49.888187+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/davidstestam_samstag
735e0c62-1b46-4707-ac7d-00155361daf1	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	adfsdferqec	Warten auf Aufnahme	2025-10-01	eecb20b7-bdde-4105-9052-19ae1a3febc7	https://storage.davidkosma.de/index.php/s/c4HmSXAXrtPcea9	2025-11-13 12:38:35.895+00	\N	Dies ist ein Test meines Bulk Vorgangs mal gucken wie viel teasöldjfkasdö lfasdflkj asödljf kasdf aslkdjf asdklfjasdf 	\N	\N	\N	\N	2025-10-12 15:01:18.941502+00	2025-11-13 13:53:31.242609+00	\N	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/adfsdferqec
4d3ccde3-bb63-4c8b-aa75-3a98dd66791d	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Bosch Tutorial	Schnitt abgeschlossen	2025-11-05	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/2qbteAtkALAKs3T	2025-10-25 09:02:46.199+00	\N	\N	\N	\N	\N	\N	2025-10-22 15:06:56.905966+00	2025-11-13 13:53:31.242609+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/04_Status_Schnitt_Abgeschlossen/bosch_tutorial
e585b220-dbc2-451b-8cae-57f05e39147a	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Magda Test	Warten auf Aufnahme	2025-10-27	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/xL8JiBxAR5bYwj2	2025-11-19 13:05:56.864+00	\N	inhalte für ein Video dokumentiere ich hier inhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hierinhalte für ein Video dokumentiere ich hier	\N	\N	\N	\N	2025-11-04 15:13:45.115179+00	2025-11-19 20:24:49.976401+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/magda_test
c2764315-72c1-4d8d-8ccc-c68825a4b835	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	testlkjashdfiasd	Idee	\N	00000000-1111-2222-3333-444444444444	https://storage.davidkosma.de/index.php/s/btdFbgyrbW343NA	2025-12-29 10:41:58.783921+00	\N	\N	\N	\N	\N	\N	2025-11-17 12:11:23.378928+00	2025-11-17 12:12:01.36961+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/testlkjashdfiasd
4aca2c7d-08b2-4fcf-b9d1-571da4d9c7d3	66bdf048-58c7-4b7b-b95f-1a91492f7db3	zweitesladebalken	Schnitt abgeschlossen	\N	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/SdRHRa7cTZkAsJz	2025-11-12 15:08:10.728+00	\N	\N	\N	\N	\N	\N	2025-11-12 13:17:09.887417+00	2025-11-12 15:08:45.422375+00	66bdf048-58c7-4b7b-b95f-1a91492f7db3	\N	data/kosmamedia/davidsmeueracc_nachnamevondavid/04_Status_Schnitt_Abgeschlossen/zweitesladebalken
f513a4cf-753e-4bd9-bd0d-33104fc67a57	66bdf048-58c7-4b7b-b95f-1a91492f7db3	Peterpan	Warten auf Aufnahme	\N	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/dZPqwe7N7tQcbnt	2025-11-21 10:42:38.88967+00	\N	\N	\N	\N	\N	\N	2025-11-12 15:08:24.112764+00	2025-11-12 15:21:52.334332+00	66bdf048-58c7-4b7b-b95f-1a91492f7db3	\N	data/kosmamedia/davidsmeueracc_nachnamevondavid/02_Status_Warten_Auf_Aufnahme/peterpan
9e697ef8-db62-4e22-99fa-82d135ae4a6c	66bdf048-58c7-4b7b-b95f-1a91492f7db3	kosmamediatestvideomittwoch peter	In Bearbeitung (Schnitt)	\N	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/sPs5x4MdrmGJpiM	2025-11-12 15:22:06.027+00	\N	\N	\N	\N	\N	\N	2025-11-12 13:00:19.278233+00	2025-11-12 15:22:36.805372+00	66bdf048-58c7-4b7b-b95f-1a91492f7db3	\N	data/kosmamedia/davidsmeueracc_nachnamevondavid/03_Status_In Bearbeitung/kosmamediatestvideomittwoch_peter
94a49eca-3e25-4cbe-b98d-4848723e254e	66bdf048-58c7-4b7b-b95f-1a91492f7db3	erstesvideo	Warten auf Aufnahme	\N	\N	https://storage.davidkosma.de/index.php/s/gNkYbq8Qjd37e5J	2025-11-12 15:34:07.387+00	\N	\N	\N	\N	\N	\N	2025-11-12 09:36:13.361638+00	2025-11-12 15:34:37.218403+00	66bdf048-58c7-4b7b-b95f-1a91492f7db3	\N	data/kosmamedia/davidsmeueracc_nachnamevondavid/02_Status_Warten_Auf_Aufnahme/erstesvideo
844ccd22-cf14-4bce-bb0e-8d8a0bf59d0f	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	das ist ein test am donnerstag	Idee	2025-11-29	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/PFN8ef4HnXPJ77N	2025-11-18 21:48:06.922+00	\N	\N	\N	\N	\N	\N	2025-11-13 14:04:41.854063+00	2025-11-18 21:48:06.967399+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/01_Status_Idee/das_ist_ein_test_am_donnerstag
afb05258-9cb8-42fe-a8e5-a78a9761b1ee	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	NathalieVanGogh	Warten auf Aufnahme	2025-11-18	00000000-1111-2222-3333-444444444444	https://storage.davidkosma.de/index.php/s/tSiEJZanLF3qf7J	2025-11-18 21:47:45.313+00	\N	\N	\N	\N	\N	\N	2025-11-17 06:27:25.081538+00	2025-11-19 09:55:21.967667+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/nathalievangogh
360ed444-9005-4f17-86bd-f30eb525f25e	66bdf048-58c7-4b7b-b95f-1a91492f7db3	cärileinitochen	Idee	\N	\N	https://storage.davidkosma.de/index.php/s/P58sdcCsM3SA4nj	2025-12-29 10:41:11.937402+00	\N	\N	\N	\N	\N	\N	2025-11-12 15:34:55.841529+00	2025-11-19 20:24:08.893955+00	66bdf048-58c7-4b7b-b95f-1a91492f7db3	\N	data/kosmamedia/davidsmeueracc_nachnamevondavid/01_Status_Idee/cärileinitochen
6227c01b-1636-4c23-a369-583cef41b7ad	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Felipe Test Video	In Bearbeitung (Schnitt)	\N	00000000-1111-2222-3333-444444444444	https://storage.davidkosma.de/index.php/s/jQNE8W2JDcJrwgE	2025-12-29 10:42:01.38985+00	\N	\N	\N	\N	\N	\N	2025-11-23 17:58:52.535355+00	2025-11-23 17:58:52.535355+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/03_Status_In Bearbeitung/felipe_test_video
9c81728e-3269-4be0-8a44-3dcd53bae075	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	drittestestvideodi	Warten auf Aufnahme	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	https://storage.davidkosma.de/index.php/s/9aSAMH683x6CACf	2025-11-12 17:16:03.305+00	\N	\N	\N	\N	\N	\N	2025-11-11 11:04:56.016782+00	2025-11-13 11:39:46.721836+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/drittestestvideodi
ca864c5a-5aa7-46b6-92ed-2073920cbdec	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	testwartenaufaufnahme	Warten auf Aufnahme	\N	66bdf048-58c7-4b7b-b95f-1a91492f7db3	https://storage.davidkosma.de/index.php/s/KGDWfNY3YxieWgL	2025-11-13 12:14:18.426+00	\N	\N	\N	\N	\N	\N	2025-11-11 12:24:16.299065+00	2025-11-13 12:14:18.476259+00	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	\N	data/kosmamedia/david_kosmahdmaccounttest/02_Status_Warten_Auf_Aufnahme/testwartenaufaufnahme
\.


--
-- Data for Name: videos_backup_20251113; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.videos_backup_20251113 (id, responsible_person, updated_at, title) FROM stdin;
44c17145-37b6-4dd7-9e74-505711a766ef	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-13 11:39:46.34791+00	asdfasdf3
da9ee534-4b91-495a-9a24-d135ba70c4cd	eecb20b7-bdde-4105-9052-19ae1a3febc7	2025-11-13 12:43:06.423765+00	iphone17pro
14f3820b-d615-4a93-9393-b6dbf20b0a68	eecb20b7-bdde-4105-9052-19ae1a3febc7	2025-11-13 12:43:18.3644+00	Vorheriger
65b6051e-7b9c-49da-90fa-0f570cc3214f	eecb20b7-bdde-4105-9052-19ae1a3febc7	2025-11-13 12:43:18.468426+00	filipe
47b5b3ff-3ef1-4cd8-a31d-07479f0e95b6	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-13 12:43:18.640928+00	asefqef
12ab53d5-0094-4eb5-8ad5-45d793f0192e	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-13 12:43:18.740038+00	Peterpanasdf
fc38de00-84ef-4b29-a270-67c1959bde26	\N	2025-11-08 14:53:17.707256+00	donnerstag 23
a9af6fbc-7969-465d-9e67-b619d55ba595	David KosmahdmAccountTest	2025-11-10 18:15:10.639724+00	donnerstag
4af25748-a920-45bb-b23d-61b11146f317	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-13 12:43:18.831232+00	dokt
0ad47849-d794-49af-bf46-28085044c52c	eecb20b7-bdde-4105-9052-19ae1a3febc7	2025-11-13 12:43:18.903211+00	n8nTestpublia
1d9da55b-4f96-47ef-92e0-b90d01c66132	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-13 13:28:09.398322+00	Probe
0b5e4e01-3ed1-44df-b8a2-d49e27d9cbe9	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-13 13:28:09.398322+00	asdfe
96cafc1e-043c-42f8-9615-a3444c886d4b	Peter OulokAccountNachname	2025-10-12 14:49:40.555532+00	popup
2c47a2e7-b890-4e3a-ba47-29505c0277cb	karate_gestarrt.15	2025-10-23 09:37:37.990208+00	14 Oktober Spazieren gehen
21d31855-cb97-42c0-a39b-72e4385e1156	Peter OulokAccountNachname	2025-10-08 16:31:41.104+00	Testpeter
ae174cb3-6cae-4a95-8d68-936e792380dc	David KosmahdmAccountTest	2025-10-12 12:13:17.364066+00	peterpan Video
71d98d6d-4c1e-4253-b744-210b7d7b54e5	\N	2025-10-23 09:25:11.238067+00	Testvideo otlook account
34fb810c-8442-444f-b2eb-87fe9b713f5e	\N	2025-10-25 09:03:00.469733+00	OktoberLessiamtelefon
4b98944a-caef-4a1a-9e99-bdd63d246015	Peter OulokAccountNachname	2025-10-23 09:37:44.7204+00	testisiichliebe dich
d5f9f056-4ee5-496b-b9a7-fb6db417ae49	Peter OulokAccountNachname	2025-10-23 09:37:44.823119+00	wird es angezeigt
cf6bc43e-383b-4f2b-abba-7a917c2f1c46	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-13 12:42:37.76899+00	cäribrauchtdecke
834bda35-3144-4f22-af00-ce9da0bb21c7	\N	2025-11-13 12:42:58.825881+00	Automatischasdofh
671bcce6-fac6-4d71-9783-530032632169	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-13 13:28:09.398322+00	testwebhook
bc20590a-42f3-43ee-807d-d0e1f1a45d5b	\N	2025-11-08 14:52:53.864314+00	anmachnechen tag
4516d787-2667-4c93-9a49-a9fb5ecb89e5	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-13 13:28:09.398322+00	Peterpan
f74a401b-994c-433b-bdb2-ff5acf27ec1c	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-13 13:28:09.398322+00	webhookgetreqeu
8a588851-0d6c-4f51-98af-d3f756a681d0	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-13 13:28:09.398322+00	Video 01 - Das ist der Anfang einer neuen Serie
59025f04-6751-4e08-9c59-8fa46b0cc31d	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-12 15:08:47.433398+00	asdfasfe
07a6d047-6d03-4641-80eb-89a76e3a29a6	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-12 15:25:35.196457+00	sdfg
fa50a009-0df4-46f8-800d-85a22a27fd56	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-12 15:34:10.013614+00	Vadimbekommtiberio
696333bc-61dd-49ee-93c3-132771762d16	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-13 11:58:45.236533+00	testnataschapodcast
3c3de436-c266-4819-bc57-871d33140ca2	0c626cc7-e0b3-41e7-8dfd-12c3c046bed5	2025-11-13 11:59:31.267588+00	patrickofeibel
4cd83d66-e88d-4982-9643-3f2af9fa9a2b	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-12 16:11:36.264303+00	testappmit
0307b871-f3be-45f2-8da2-9a0fa2f400d0	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-13 12:15:06.086412+00	DasisteinTestamDonnerstag
e3607779-5578-48e4-9447-1e551a285120	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-13 11:39:46.423276+00	fdgadf
24d467e4-d3aa-495b-8518-d96a58326518	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-13 11:39:46.535625+00	zweitertestamdienstag
e585b220-dbc2-451b-8cae-57f05e39147a	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-13 11:39:46.623615+00	Magda Test
360ed444-9005-4f17-86bd-f30eb525f25e	\N	2025-11-13 12:42:33.160278+00	cärileinitochen
735e0c62-1b46-4707-ac7d-00155361daf1	Peter OulokAccountNachname	2025-11-13 12:43:18.558355+00	adfsdferqec
61ec3891-9b71-4dec-a346-3bf7b2a46d4d	\N	2025-10-23 12:17:44.885359+00	topvideo
4d3ccde3-bb63-4c8b-aa75-3a98dd66791d	David KosmahdmAccountTest	2025-10-25 09:02:46.229075+00	Bosch Tutorial
ffccda99-3faf-4d01-8b72-851b48124272	\N	2025-11-11 12:24:44.152619+00	poppasdf
090f12c1-389b-4fb2-b99f-404a276363b3	Peter OulokAccountNachname	2025-11-08 14:50:48.624852+00	Davidstestam Samstag
4aca2c7d-08b2-4fcf-b9d1-571da4d9c7d3	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-12 15:08:45.422375+00	zweitesladebalken
f513a4cf-753e-4bd9-bd0d-33104fc67a57	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-12 15:21:52.334332+00	Peterpan
9e697ef8-db62-4e22-99fa-82d135ae4a6c	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-12 15:22:36.805372+00	kosmamediatestvideomittwoch peter
94a49eca-3e25-4cbe-b98d-4848723e254e	\N	2025-11-12 15:34:37.218403+00	erstesvideo
9c81728e-3269-4be0-8a44-3dcd53bae075	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-13 11:39:46.721836+00	drittestestvideodi
ca864c5a-5aa7-46b6-92ed-2073920cbdec	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-13 12:14:18.476259+00	testwartenaufaufnahme
\.


--
-- Data for Name: workspace_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workspace_members (id, workspace_owner_id, user_id, role, permissions, invited_by, invited_at, status, invitation_token, invitation_email, created_at, updated_at) FROM stdin;
0c626cc7-e0b3-41e7-8dfd-12c3c046bed5	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	owner	{"can_edit": true, "can_view": true, "can_create": true, "can_delete": true}	\N	2025-10-08 10:46:34.455149+00	active	\N	\N	2025-10-08 10:46:34.455149+00	2025-10-08 10:46:34.455149+00
7a98317e-a70b-4037-a2c5-1d3e08106045	66bdf048-58c7-4b7b-b95f-1a91492f7db3	66bdf048-58c7-4b7b-b95f-1a91492f7db3	owner	{"can_edit": true, "can_view": true, "can_create": true, "can_delete": true}	\N	2025-11-11 16:25:41.604087+00	active	\N	\N	2025-11-11 16:25:41.604087+00	2025-11-11 16:25:41.604087+00
68c37d2d-54ff-427f-8190-dbe8e6b02d40	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	66bdf048-58c7-4b7b-b95f-1a91492f7db3	collaborator	{"can_edit": true, "can_view": true, "can_create": true, "can_delete": false}	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-15 09:41:14.722779+00	active	inv_hsyznsypfimya4pnsspqq	david.kosma@kosmamedia.de	2025-11-15 09:41:14.722779+00	2025-11-15 18:23:49.134+00
\.


--
-- Data for Name: workspace_views; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workspace_views (id, workspace_owner_id, name, is_default, filters, sort_config, column_settings, created_by, created_at, updated_at) FROM stdin;
458587e7-054b-49f2-92dd-2adb12d42bd4	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Zuletzt Aktualisierut	f	{}	[]	\N	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-21 10:40:34.665781+00	2025-11-21 10:40:34.665781+00
1c19fd07-f706-417a-bc39-33d4fd97ee5e	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	sdgaf	f	{}	[]	{"order": ["title", "publication_date", "storage_location", "status", "description", "upload", "responsible_person", "inspiration_source", "updated_at", "actions"], "hidden": [], "widths": {}}	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-23 18:02:08.047196+00	2025-12-29 10:40:36.030149+00
8eb13ea7-3b0c-4654-a6c2-fb8508304c37	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	Moris Ansicht	f	{}	[]	{"order": ["title", "status", "publication_date", "storage_location", "description", "upload", "responsible_person", "inspiration_source", "updated_at", "actions"], "hidden": [], "widths": {}}	8ed7f903-a032-4bb8-adde-4248b2d3c0d2	2025-11-10 18:11:29.919229+00	2025-11-12 16:30:25.273536+00
b13fdcaf-f001-48b9-978f-d17dae927d62	66bdf048-58c7-4b7b-b95f-1a91492f7db3	adsf	f	{}	[]	\N	66bdf048-58c7-4b7b-b95f-1a91492f7db3	2025-11-12 10:56:26.951945+00	2025-11-12 15:24:22.855304+00
\.


--
-- Name: automation_settings automation_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_settings
    ADD CONSTRAINT automation_settings_pkey PRIMARY KEY (id);


--
-- Name: automation_settings automation_settings_user_id_workspace_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_settings
    ADD CONSTRAINT automation_settings_user_id_workspace_owner_id_key UNIQUE (user_id, workspace_owner_id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referral_code_key UNIQUE (referral_code);


--
-- Name: responsibility_notifications responsibility_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibility_notifications
    ADD CONSTRAINT responsibility_notifications_pkey PRIMARY KEY (id);


--
-- Name: social_media_accounts social_media_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_media_accounts
    ADD CONSTRAINT social_media_accounts_pkey PRIMARY KEY (id);


--
-- Name: social_media_accounts social_media_accounts_user_id_platform_mixpost_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_media_accounts
    ADD CONSTRAINT social_media_accounts_user_id_platform_mixpost_account_id_key UNIQUE (user_id, platform, mixpost_account_id);


--
-- Name: social_media_posts social_media_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_media_posts
    ADD CONSTRAINT social_media_posts_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_subscription_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_unique UNIQUE (stripe_subscription_id);


--
-- Name: subscriptions subscriptions_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);


--
-- Name: user_table_settings unique_user_workspace_context; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_table_settings
    ADD CONSTRAINT unique_user_workspace_context UNIQUE (user_id, workspace_owner_id, context);


--
-- Name: user_mixpost_config user_mixpost_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mixpost_config
    ADD CONSTRAINT user_mixpost_config_pkey PRIMARY KEY (id);


--
-- Name: user_mixpost_config user_mixpost_config_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mixpost_config
    ADD CONSTRAINT user_mixpost_config_user_id_key UNIQUE (user_id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_table_settings user_table_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_table_settings
    ADD CONSTRAINT user_table_settings_pkey PRIMARY KEY (id);


--
-- Name: user_trials user_trials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_trials
    ADD CONSTRAINT user_trials_pkey PRIMARY KEY (id);


--
-- Name: user_trials user_trials_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_trials
    ADD CONSTRAINT user_trials_user_id_key UNIQUE (user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);


--
-- Name: workspace_members workspace_members_workspace_owner_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_owner_user_unique UNIQUE (workspace_owner_id, user_id);


--
-- Name: workspace_views workspace_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_views
    ADD CONSTRAINT workspace_views_pkey PRIMARY KEY (id);


--
-- Name: idx_automation_settings_user_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automation_settings_user_workspace ON public.automation_settings USING btree (user_id, workspace_owner_id);


--
-- Name: idx_referrals_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_code ON public.referrals USING btree (referral_code);


--
-- Name: idx_referrals_referred_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referred_user ON public.referrals USING btree (referred_user_id);


--
-- Name: idx_referrals_referrer_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referrer_user ON public.referrals USING btree (referrer_user_id);


--
-- Name: idx_referrals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_status ON public.referrals USING btree (status);


--
-- Name: idx_responsibility_notifications_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_responsibility_notifications_recipient ON public.responsibility_notifications USING btree (recipient_user_id, is_read, created_at DESC);


--
-- Name: idx_responsibility_notifications_video; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_responsibility_notifications_video ON public.responsibility_notifications USING btree (video_id);


--
-- Name: idx_social_accounts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_accounts_active ON public.social_media_accounts USING btree (user_id, is_active);


--
-- Name: idx_social_accounts_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_accounts_platform ON public.social_media_accounts USING btree (platform);


--
-- Name: idx_social_accounts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_accounts_user ON public.social_media_accounts USING btree (user_id);


--
-- Name: idx_social_posts_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_posts_platform ON public.social_media_posts USING btree (platform);


--
-- Name: idx_social_posts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_posts_status ON public.social_media_posts USING btree (status);


--
-- Name: idx_social_posts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_posts_user ON public.social_media_posts USING btree (user_id);


--
-- Name: idx_social_posts_video; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_posts_video ON public.social_media_posts USING btree (video_id);


--
-- Name: idx_user_mixpost_config_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_mixpost_config_user ON public.user_mixpost_config USING btree (user_id);


--
-- Name: idx_user_table_settings_user_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_table_settings_user_workspace ON public.user_table_settings USING btree (user_id, workspace_owner_id);


--
-- Name: idx_users_main_storage_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_main_storage_location ON public.users USING btree (main_storage_location);


--
-- Name: idx_users_onboarding_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_onboarding_completed ON public.users USING btree (onboarding_completed_at);


--
-- Name: idx_videos_backup_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_backup_id ON public.videos_backup_20251113 USING btree (id);


--
-- Name: idx_videos_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_created_by ON public.videos USING btree (created_by);


--
-- Name: idx_videos_nextcloud_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_nextcloud_path ON public.videos USING btree (nextcloud_path);


--
-- Name: idx_videos_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_updated_at ON public.videos USING btree (updated_at DESC);


--
-- Name: idx_videos_workspace_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_workspace_owner_id ON public.videos USING btree (workspace_owner_id);


--
-- Name: idx_workspace_members_invitation_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_members_invitation_token ON public.workspace_members USING btree (invitation_token) WHERE (invitation_token IS NOT NULL);


--
-- Name: idx_workspace_members_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_members_status ON public.workspace_members USING btree (status);


--
-- Name: idx_workspace_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_members_user_id ON public.workspace_members USING btree (user_id);


--
-- Name: idx_workspace_members_workspace_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_members_workspace_owner ON public.workspace_members USING btree (workspace_owner_id);


--
-- Name: idx_workspace_views_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_views_owner ON public.workspace_views USING btree (workspace_owner_id);


--
-- Name: workspace_members_unique_active_membership; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workspace_members_unique_active_membership ON public.workspace_members USING btree (workspace_owner_id, user_id) WHERE ((status = 'active'::text) AND (user_id IS NOT NULL));


--
-- Name: workspace_members_unique_pending_invitation_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workspace_members_unique_pending_invitation_email ON public.workspace_members USING btree (workspace_owner_id, invitation_email) WHERE ((status = 'pending'::text) AND (invitation_email IS NOT NULL));


--
-- Name: videos N8N - Videos - Nextcloud Ordner erstellen / verschieben; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "N8N - Videos - Nextcloud Ordner erstellen / verschieben" AFTER INSERT ON public.videos FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://n8n.davidkosma.de/webhook/e16e4a86-0338-4ff8-9ed1-14a23901d550', 'GET', '{"Content-type":"application/json"}', '{}', '5000');


--
-- Name: videos N8N produktiv; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "N8N produktiv" AFTER INSERT ON public.videos FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://n8n.davidkosma.de/webhook/eba68fc3-855b-40ec-b446-0161ca3fc153', 'GET', '{"Content-type":"application/json"}', '{}', '5000');


--
-- Name: automation_settings automation_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER automation_settings_updated_at BEFORE UPDATE ON public.automation_settings FOR EACH ROW EXECUTE FUNCTION public.update_automation_settings_updated_at();


--
-- Name: users n8n - new User Folder Structure; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "n8n - new User Folder Structure" AFTER INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://n8n.davidkosma.de/webhook/eba68fc3-855b-40ec-b446-0161ca3fc153', 'GET', '{"Content-type":"application/json"}', '{}', '5000');


--
-- Name: subscriptions trigger_create_workspace_owner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_workspace_owner AFTER INSERT OR UPDATE OF status ON public.subscriptions FOR EACH ROW WHEN ((new.status = ANY (ARRAY['active'::text, 'trialing'::text]))) EXECUTE FUNCTION public.create_workspace_owner_entry();


--
-- Name: social_media_accounts update_social_media_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_social_media_accounts_updated_at BEFORE UPDATE ON public.social_media_accounts FOR EACH ROW EXECUTE FUNCTION public.update_social_media_updated_at();


--
-- Name: social_media_posts update_social_media_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_social_media_posts_updated_at BEFORE UPDATE ON public.social_media_posts FOR EACH ROW EXECUTE FUNCTION public.update_social_media_updated_at();


--
-- Name: user_mixpost_config update_user_mixpost_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_mixpost_config_updated_at BEFORE UPDATE ON public.user_mixpost_config FOR EACH ROW EXECUTE FUNCTION public.update_social_media_updated_at();


--
-- Name: user_table_settings update_user_table_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_table_settings_updated_at BEFORE UPDATE ON public.user_table_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspace_views update_workspace_views_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workspace_views_updated_at BEFORE UPDATE ON public.workspace_views FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: videos videos_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER videos_updated_at_trigger BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_videos_updated_at();


--
-- Name: automation_settings automation_settings_auto_assign_on_idea_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_settings
    ADD CONSTRAINT automation_settings_auto_assign_on_idea_fkey FOREIGN KEY (auto_assign_on_idea) REFERENCES auth.users(id);


--
-- Name: automation_settings automation_settings_auto_assign_on_waiting_for_recording_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_settings
    ADD CONSTRAINT automation_settings_auto_assign_on_waiting_for_recording_fkey FOREIGN KEY (auto_assign_on_waiting_for_recording) REFERENCES auth.users(id);


--
-- Name: automation_settings automation_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_settings
    ADD CONSTRAINT automation_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: automation_settings automation_settings_workspace_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_settings
    ADD CONSTRAINT automation_settings_workspace_owner_id_fkey FOREIGN KEY (workspace_owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: referrals referrals_referrer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: responsibility_notifications responsibility_notifications_new_responsible_person_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibility_notifications
    ADD CONSTRAINT responsibility_notifications_new_responsible_person_fkey FOREIGN KEY (new_responsible_person) REFERENCES auth.users(id);


--
-- Name: responsibility_notifications responsibility_notifications_previous_responsible_person_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibility_notifications
    ADD CONSTRAINT responsibility_notifications_previous_responsible_person_fkey FOREIGN KEY (previous_responsible_person) REFERENCES auth.users(id);


--
-- Name: responsibility_notifications responsibility_notifications_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibility_notifications
    ADD CONSTRAINT responsibility_notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: responsibility_notifications responsibility_notifications_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibility_notifications
    ADD CONSTRAINT responsibility_notifications_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: social_media_accounts social_media_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_media_accounts
    ADD CONSTRAINT social_media_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: social_media_posts social_media_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_media_posts
    ADD CONSTRAINT social_media_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: social_media_posts social_media_posts_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_media_posts
    ADD CONSTRAINT social_media_posts_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_mixpost_config user_mixpost_config_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mixpost_config
    ADD CONSTRAINT user_mixpost_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_table_settings user_table_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_table_settings
    ADD CONSTRAINT user_table_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_table_settings user_table_settings_workspace_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_table_settings
    ADD CONSTRAINT user_table_settings_workspace_owner_id_fkey FOREIGN KEY (workspace_owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_trials user_trials_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_trials
    ADD CONSTRAINT user_trials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: videos videos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: videos videos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: videos videos_workspace_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_workspace_owner_id_fkey FOREIGN KEY (workspace_owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: workspace_members workspace_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_workspace_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_owner_id_fkey FOREIGN KEY (workspace_owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workspace_views workspace_views_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_views
    ADD CONSTRAINT workspace_views_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workspace_views workspace_views_workspace_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_views
    ADD CONSTRAINT workspace_views_workspace_owner_id_fkey FOREIGN KEY (workspace_owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: users Authenticated users can read other users basic info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read other users basic info" ON public.users FOR SELECT TO authenticated USING (true);


--
-- Name: videos_backup_20251113 Backup: Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Backup: Service role only" ON public.videos_backup_20251113 TO service_role USING (true) WITH CHECK (true);


--
-- Name: responsibility_notifications Service role can insert responsibility notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert responsibility notifications" ON public.responsibility_notifications FOR INSERT WITH CHECK (true);


--
-- Name: referrals Service role can update referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update referrals" ON public.referrals FOR UPDATE USING (true);


--
-- Name: user_preferences Service role full access to preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access to preferences" ON public.user_preferences TO service_role USING (true);


--
-- Name: subscriptions Service role full access to subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access to subscriptions" ON public.subscriptions TO service_role USING (true);


--
-- Name: user_trials Service role full access to trials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access to trials" ON public.user_trials TO service_role USING (true);


--
-- Name: users Service role full access to users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access to users" ON public.users TO service_role USING (true);


--
-- Name: videos Service role full access to videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access to videos" ON public.videos TO service_role USING (true);


--
-- Name: user_table_settings Users can create own table settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own table settings" ON public.user_table_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: referrals Users can create their own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own referrals" ON public.referrals FOR INSERT WITH CHECK ((auth.uid() = referrer_user_id));


--
-- Name: user_table_settings Users can delete own table settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own table settings" ON public.user_table_settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_mixpost_config Users can delete their own mixpost config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own mixpost config" ON public.user_mixpost_config FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: responsibility_notifications Users can delete their own responsibility notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own responsibility notifications" ON public.responsibility_notifications FOR DELETE USING ((auth.uid() = recipient_user_id));


--
-- Name: social_media_accounts Users can delete their own social media accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own social media accounts" ON public.social_media_accounts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: social_media_posts Users can delete their own social media posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own social media posts" ON public.social_media_posts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: videos Users can delete their own videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own videos" ON public.videos FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_mixpost_config Users can insert their own mixpost config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own mixpost config" ON public.user_mixpost_config FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_preferences Users can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: social_media_accounts Users can insert their own social media accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own social media accounts" ON public.social_media_accounts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: social_media_posts Users can insert their own social media posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own social media posts" ON public.social_media_posts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: subscriptions Users can insert their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_trials Users can insert their own trials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own trials" ON public.user_trials FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: videos Users can insert their own videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own videos" ON public.videos FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: videos Users can manage own videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own videos" ON public.videos USING ((auth.uid() = user_id));


--
-- Name: automation_settings Users can manage their own automation settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own automation settings" ON public.automation_settings USING ((auth.uid() = user_id));


--
-- Name: user_table_settings Users can read own table settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own table settings" ON public.user_table_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: users Users can read their own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own data" ON public.users FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_preferences Users can read their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own preferences" ON public.user_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can read their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own subscriptions" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_trials Users can read their own trials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own trials" ON public.user_trials FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: videos Users can read their own videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own videos" ON public.videos FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() = workspace_owner_id) OR (EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_owner_id = videos.workspace_owner_id) AND (workspace_members.user_id = auth.uid()) AND (workspace_members.status = 'active'::text))))));


--
-- Name: user_table_settings Users can update own table settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own table settings" ON public.user_table_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: users Users can update their own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING ((auth.uid() = id));


--
-- Name: user_mixpost_config Users can update their own mixpost config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own mixpost config" ON public.user_mixpost_config FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: responsibility_notifications Users can update their own responsibility notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own responsibility notifications" ON public.responsibility_notifications FOR UPDATE USING ((auth.uid() = recipient_user_id));


--
-- Name: social_media_accounts Users can update their own social media accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own social media accounts" ON public.social_media_accounts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: social_media_posts Users can update their own social media posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own social media posts" ON public.social_media_posts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can update their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_trials Users can update their own trials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own trials" ON public.user_trials FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: videos Users can update their own videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own videos" ON public.videos FOR UPDATE USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_owner_id = videos.workspace_owner_id) AND (workspace_members.user_id = auth.uid()) AND (workspace_members.status = 'active'::text) AND ((workspace_members.permissions ->> 'can_edit'::text) = 'true'::text))))));


--
-- Name: user_mixpost_config Users can view their own mixpost config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own mixpost config" ON public.user_mixpost_config FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referrals Users can view their own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own referrals" ON public.referrals FOR SELECT USING (((auth.uid() = referrer_user_id) OR (auth.uid() = referred_user_id)));


--
-- Name: responsibility_notifications Users can view their own responsibility notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own responsibility notifications" ON public.responsibility_notifications FOR SELECT USING ((auth.uid() = recipient_user_id));


--
-- Name: social_media_accounts Users can view their own social media accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own social media accounts" ON public.social_media_accounts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: social_media_posts Users can view their own social media posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own social media posts" ON public.social_media_posts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: workspace_views View creators and owners can delete views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View creators and owners can delete views" ON public.workspace_views FOR DELETE USING (((created_by = auth.uid()) OR (workspace_owner_id = auth.uid())));


--
-- Name: workspace_views View creators and owners can update views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View creators and owners can update views" ON public.workspace_views FOR UPDATE USING (((created_by = auth.uid()) OR (workspace_owner_id = auth.uid())));


--
-- Name: workspace_views Workspace members can create views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can create views" ON public.workspace_views FOR INSERT WITH CHECK (((workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_owner_id = workspace_views.workspace_owner_id) AND (workspace_members.user_id = auth.uid()) AND (workspace_members.status = 'active'::text))))));


--
-- Name: workspace_views Workspace members can read views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can read views" ON public.workspace_views FOR SELECT USING (((workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_members
  WHERE ((workspace_members.workspace_owner_id = workspace_views.workspace_owner_id) AND (workspace_members.user_id = auth.uid()) AND (workspace_members.status = 'active'::text))))));


--
-- Name: automation_settings Workspace owners can view automation settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace owners can view automation settings" ON public.automation_settings FOR SELECT USING (((auth.uid() = workspace_owner_id) OR (EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_owner_id = automation_settings.workspace_owner_id) AND (wm.user_id = auth.uid()) AND (wm.status = 'active'::text))))));


--
-- Name: automation_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: responsibility_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.responsibility_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: social_media_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: social_media_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_mixpost_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_mixpost_config ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_table_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_table_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_trials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

--
-- Name: videos_backup_20251113; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.videos_backup_20251113 ENABLE ROW LEVEL SECURITY;

--
-- Name: videos videos_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY videos_delete_policy ON public.videos FOR DELETE USING (((auth.uid() = workspace_owner_id) OR (EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_owner_id = videos.workspace_owner_id) AND (wm.user_id = auth.uid()) AND (wm.status = 'active'::text) AND (((wm.permissions ->> 'can_delete'::text))::boolean = true))))));


--
-- Name: videos videos_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY videos_insert_policy ON public.videos FOR INSERT WITH CHECK (((auth.uid() = user_id) AND ((auth.uid() = workspace_owner_id) OR (EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_owner_id = videos.workspace_owner_id) AND (wm.user_id = auth.uid()) AND (wm.status = 'active'::text) AND (((wm.permissions ->> 'can_create'::text))::boolean = true)))))));


--
-- Name: videos videos_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY videos_select_policy ON public.videos FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() = workspace_owner_id) OR (EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_owner_id = videos.workspace_owner_id) AND (wm.user_id = auth.uid()) AND (wm.status = 'active'::text) AND (((wm.permissions ->> 'can_view'::text))::boolean = true))))));


--
-- Name: videos videos_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY videos_update_policy ON public.videos FOR UPDATE USING (((auth.uid() = workspace_owner_id) OR (EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_owner_id = videos.workspace_owner_id) AND (wm.user_id = auth.uid()) AND (wm.status = 'active'::text) AND (((wm.permissions ->> 'can_edit'::text))::boolean = true))))));


--
-- Name: workspace_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_members workspace_members_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspace_members_delete_policy ON public.workspace_members FOR DELETE USING (((auth.uid() = workspace_owner_id) OR (auth.uid() = user_id) OR ((status = 'pending'::text) AND (invitation_email IN ( SELECT users.email
   FROM public.users
  WHERE (users.id = auth.uid()))))));


--
-- Name: workspace_members workspace_members_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspace_members_insert_policy ON public.workspace_members FOR INSERT WITH CHECK ((auth.uid() = workspace_owner_id));


--
-- Name: workspace_members workspace_members_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspace_members_select_policy ON public.workspace_members FOR SELECT USING (((auth.uid() = workspace_owner_id) OR (auth.uid() = user_id)));


--
-- Name: workspace_members workspace_members_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspace_members_update_policy ON public.workspace_members FOR UPDATE USING (((auth.uid() = workspace_owner_id) OR (auth.uid() = user_id) OR ((status = 'pending'::text) AND (invitation_email IN ( SELECT users.email
   FROM public.users
  WHERE (users.id = auth.uid()))))));


--
-- Name: workspace_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_views ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict UBeZ9WJYbyb1Cw99ikHHtjhhLkJATl1v1RUl1ays9ZzLKweSH2GoiwfDUUf14gC

