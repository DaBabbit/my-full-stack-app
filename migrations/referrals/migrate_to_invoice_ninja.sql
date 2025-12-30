-- =====================================================
-- Migration: Referrals Tabelle für Invoice Ninja
-- =====================================================
-- Beschreibung: Vereinfacht Referrals für Invoice Ninja (ohne Stripe Coupons)
-- Datum: 2024-12-30

-- Neue Spalten für Invoice Ninja Referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS discount_applied BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 25000,
  ADD COLUMN IF NOT EXISTS applied_to_invoice_id TEXT;

-- Kommentare
COMMENT ON COLUMN public.referrals.discount_applied IS 'Wurde der Rabatt bereits angewendet?';
COMMENT ON COLUMN public.referrals.discount_amount IS 'Rabatt-Betrag in Cent (25000 = 250€)';
COMMENT ON COLUMN public.referrals.applied_to_invoice_id IS 'Invoice Ninja Invoice ID auf die der Rabatt angewendet wurde';

-- Alte Stripe-Spalten als optional markieren
DO $$
BEGIN
  ALTER TABLE public.referrals
    ALTER COLUMN stripe_coupon_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'stripe_coupon_id already allows NULL or does not exist';
END $$;

DO $$
BEGIN
  ALTER TABLE public.referrals
    ALTER COLUMN stripe_promotion_code DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'stripe_promotion_code already allows NULL or does not exist';
END $$;

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_referrals_discount_applied 
  ON public.referrals(discount_applied);

-- Log erfolgreiche Migration
DO $$
BEGIN
  RAISE NOTICE 'Referrals Migration zu Invoice Ninja erfolgreich abgeschlossen';
  RAISE NOTICE 'Neue Spalten: discount_applied, discount_amount, applied_to_invoice_id';
END $$;

