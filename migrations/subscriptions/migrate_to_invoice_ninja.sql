-- =====================================================
-- Migration: Subscriptions Tabelle für Invoice Ninja
-- =====================================================
-- Beschreibung: Fügt Invoice Ninja Spalten hinzu, macht Stripe-Spalten optional
-- Datum: 2024-12-30

-- Neue Spalten für Invoice Ninja
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS invoice_ninja_client_id TEXT,
  ADD COLUMN IF NOT EXISTS invoice_ninja_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS invoice_ninja_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'gocardless_sepa',
  ADD COLUMN IF NOT EXISTS gocardless_mandate_id TEXT,
  ADD COLUMN IF NOT EXISTS last_api_sync TIMESTAMPTZ DEFAULT NOW();

-- Kommentare für neue Spalten
COMMENT ON COLUMN public.subscriptions.invoice_ninja_client_id IS 'Invoice Ninja Client ID (Customer)';
COMMENT ON COLUMN public.subscriptions.invoice_ninja_subscription_id IS 'Invoice Ninja Recurring Invoice ID';
COMMENT ON COLUMN public.subscriptions.invoice_ninja_invoice_id IS 'Aktuelle Invoice ID';
COMMENT ON COLUMN public.subscriptions.payment_method IS 'Zahlungsmethode (gocardless_sepa, etc.)';
COMMENT ON COLUMN public.subscriptions.gocardless_mandate_id IS 'GoCardless SEPA-Lastschriftmandat ID';
COMMENT ON COLUMN public.subscriptions.last_api_sync IS 'Letzter Sync mit Invoice Ninja API';

-- Alte Stripe-Spalten als optional markieren (für Migration)
-- Nur ausführen wenn die Spalten NOT NULL sind
DO $$
BEGIN
  ALTER TABLE public.subscriptions 
    ALTER COLUMN stripe_customer_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'stripe_customer_id already allows NULL or does not exist';
END $$;

DO $$
BEGIN
  ALTER TABLE public.subscriptions 
    ALTER COLUMN stripe_subscription_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'stripe_subscription_id already allows NULL or does not exist';
END $$;

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_subscriptions_invoice_ninja_client 
  ON public.subscriptions(invoice_ninja_client_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_last_api_sync 
  ON public.subscriptions(last_api_sync);

-- Füge neue Status-Werte hinzu (falls status ein ENUM ist, sonst ignorieren)
-- Kommentar: Status kann sein: active, past_due, canceled, pending
COMMENT ON COLUMN public.subscriptions.status IS 'Subscription Status: active, past_due, canceled, pending, trialing';

-- Log erfolgreiche Migration
DO $$
BEGIN
  RAISE NOTICE 'Migration zu Invoice Ninja erfolgreich abgeschlossen';
  RAISE NOTICE 'Neue Spalten: invoice_ninja_client_id, invoice_ninja_subscription_id, invoice_ninja_invoice_id';
  RAISE NOTICE 'Neue Spalten: payment_method, gocardless_mandate_id, last_api_sync';
END $$;

