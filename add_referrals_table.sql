-- =====================================================
-- Migration: Empfehlungs-System (Referrals)
-- =====================================================
-- Beschreibung: Tabelle für Freunde-werben-Freunde Feature
-- Referrer erhält 250€ Rabatt wenn geworbener Kunde erste Rechnung bezahlt

-- Erstelle referrals Tabelle
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_coupon_id TEXT,
  stripe_promotion_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded', 'expired')),
  first_payment_received BOOLEAN DEFAULT FALSE,
  reward_amount INTEGER DEFAULT 25000, -- in Cent (250€)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ
);

-- Kommentare
COMMENT ON TABLE public.referrals IS 'Empfehlungs-System für Freunde werben Freunde';
COMMENT ON COLUMN public.referrals.referrer_user_id IS 'User der empfohlen hat';
COMMENT ON COLUMN public.referrals.referral_code IS 'Eindeutiger Empfehlungscode (z.B. REF-ABC123)';
COMMENT ON COLUMN public.referrals.referred_user_id IS 'User der geworben wurde';
COMMENT ON COLUMN public.referrals.stripe_coupon_id IS 'Stripe Coupon ID für Rabatt';
COMMENT ON COLUMN public.referrals.status IS 'Status: pending (wartet auf Zahlung), completed (Zahlung erfolgt), rewarded (Belohnung ausgezahlt), expired (abgelaufen)';
COMMENT ON COLUMN public.referrals.reward_amount IS 'Rabatt-Betrag in Cent';

-- Indices für Performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_user 
ON public.referrals(referrer_user_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_user 
ON public.referrals(referred_user_id);

CREATE INDEX IF NOT EXISTS idx_referrals_code 
ON public.referrals(referral_code);

CREATE INDEX IF NOT EXISTS idx_referrals_status 
ON public.referrals(status);

-- RLS (Row Level Security) Policies
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policy: User kann eigene Referrals sehen
CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_user_id);

-- Policy: User kann eigene Referrals erstellen
CREATE POLICY "Users can create their own referrals"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referrer_user_id);

-- Policy: Nur Service Role kann Referrals updaten (für Webhook)
CREATE POLICY "Service role can update referrals"
ON public.referrals
FOR UPDATE
USING (true);

-- Erfolgsmeldung
DO $$
BEGIN
  RAISE NOTICE 'Migration erfolgreich: referrals Tabelle mit RLS erstellt';
END $$;

