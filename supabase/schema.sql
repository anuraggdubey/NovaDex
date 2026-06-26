-- ==========================================
-- NovaDEX v2.0 - Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor
-- supabase.com > Your Project > SQL Editor > New Query > Paste > Run
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLE 1: users
-- Stores wallet identity. Public key = user ID.
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
  wallet_address      TEXT PRIMARY KEY,
  first_seen          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  swap_count          INTEGER NOT NULL DEFAULT 0,
  total_volume_usdc   NUMERIC(20, 6) NOT NULL DEFAULT 0,
  total_savings_usdc  NUMERIC(20, 6) NOT NULL DEFAULT 0,
  preferred_network   TEXT NOT NULL DEFAULT 'testnet' CHECK (preferred_network IN ('testnet', 'mainnet')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security: users can only read their own row
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own row"
  ON public.users FOR SELECT
  USING (auth.uid()::text = wallet_address);

CREATE POLICY "Service role can read all"
  ON public.users FOR ALL
  USING (true);

-- ==========================================
-- TABLE 2: swaps
-- Full on-chain swap record per transaction.
-- ==========================================
CREATE TABLE IF NOT EXISTS public.swaps (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address        TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  tx_hash               TEXT UNIQUE NOT NULL,
  asset_in_code         TEXT NOT NULL,
  asset_in_issuer       TEXT,
  asset_out_code        TEXT NOT NULL,
  asset_out_issuer      TEXT,
  amount_in             NUMERIC(20, 7) NOT NULL,
  amount_out            NUMERIC(20, 7) NOT NULL,
  amount_out_direct_best NUMERIC(20, 7),
  savings_usdc          NUMERIC(20, 6) NOT NULL DEFAULT 0,
  route_fingerprint     TEXT,
  route_json            JSONB,
  slippage_tolerance    NUMERIC(5, 2) NOT NULL DEFAULT 0.5,
  price_impact          NUMERIC(5, 2) NOT NULL DEFAULT 0,
  protocol_fee_usdc     NUMERIC(20, 6) NOT NULL DEFAULT 0,
  network               TEXT NOT NULL DEFAULT 'testnet' CHECK (network IN ('testnet', 'mainnet')),
  status                TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'reverted', 'pending')),
  executed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own swaps"
  ON public.swaps FOR SELECT
  USING (wallet_address = auth.uid()::text);

CREATE POLICY "Service role full access on swaps"
  ON public.swaps FOR ALL
  USING (true);

-- Index for fast history lookups
CREATE INDEX IF NOT EXISTS idx_swaps_wallet_address ON public.swaps (wallet_address, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_swaps_tx_hash ON public.swaps (tx_hash);

-- ==========================================
-- TABLE 3: favourites
-- Asset pair favourites per wallet
-- ==========================================
CREATE TABLE IF NOT EXISTS public.favourites (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address   TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  asset_in_code    TEXT NOT NULL,
  asset_in_issuer  TEXT,
  asset_out_code   TEXT NOT NULL,
  asset_out_issuer TEXT,
  label            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own favourites"
  ON public.favourites FOR SELECT
  USING (wallet_address = auth.uid()::text);

CREATE POLICY "Service role full access on favourites"
  ON public.favourites FOR ALL
  USING (true);

-- ==========================================
-- TABLE 4: presets
-- Saved swap presets (pair + default amount)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.presets (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address   TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  asset_in_code    TEXT NOT NULL,
  asset_in_issuer  TEXT,
  asset_out_code   TEXT NOT NULL,
  asset_out_issuer TEXT,
  default_amount   NUMERIC(20, 7) NOT NULL,
  label            TEXT,
  use_count        INTEGER NOT NULL DEFAULT 0,
  last_used_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own presets"
  ON public.presets FOR SELECT
  USING (wallet_address = auth.uid()::text);

CREATE POLICY "Service role full access on presets"
  ON public.presets FOR ALL
  USING (true);

-- ==========================================
-- TABLE 5: global_stats
-- Single-row aggregate table. Auto-updated by trigger.
-- ==========================================
CREATE TABLE IF NOT EXISTS public.global_stats (
  id                  INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_volume_usdc   NUMERIC(20, 6) NOT NULL DEFAULT 0,
  total_swaps         BIGINT NOT NULL DEFAULT 0,
  total_savings_usdc  NUMERIC(20, 6) NOT NULL DEFAULT 0,
  unique_wallets      INTEGER NOT NULL DEFAULT 0,
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.global_stats ENABLE ROW LEVEL SECURITY;

-- Global stats are readable by everyone
CREATE POLICY "Global stats are public"
  ON public.global_stats FOR SELECT
  USING (true);

CREATE POLICY "Service role full access on global_stats"
  ON public.global_stats FOR ALL
  USING (true);

-- Seed single row
INSERT INTO public.global_stats (id, total_volume_usdc, total_swaps, total_savings_usdc, unique_wallets)
VALUES (1, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- TRIGGER: Update global_stats after each swap insert
-- ==========================================
CREATE OR REPLACE FUNCTION update_global_stats_on_swap()
RETURNS TRIGGER AS $$
BEGIN
  -- Update global stats
  UPDATE public.global_stats
  SET
    total_volume_usdc  = total_volume_usdc + NEW.amount_in,
    total_swaps        = total_swaps + 1,
    total_savings_usdc = total_savings_usdc + NEW.savings_usdc,
    unique_wallets     = (SELECT COUNT(DISTINCT wallet_address) FROM public.swaps),
    last_updated       = NOW()
  WHERE id = 1;

  -- Update user aggregate stats
  UPDATE public.users
  SET
    swap_count         = swap_count + 1,
    total_volume_usdc  = total_volume_usdc + NEW.amount_in,
    total_savings_usdc = total_savings_usdc + NEW.savings_usdc,
    last_seen          = NOW()
  WHERE wallet_address = NEW.wallet_address;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_update_global_stats
  AFTER INSERT ON public.swaps
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_global_stats_on_swap();

-- ==========================================
-- VIEWS: Useful aggregates
-- ==========================================

-- Top pairs by volume
CREATE OR REPLACE VIEW public.top_pairs AS
SELECT
  asset_in_code,
  asset_out_code,
  COUNT(*) AS swap_count_24h,
  SUM(amount_in) AS volume_24h,
  AVG(savings_usdc) AS avg_savings_usdc
FROM public.swaps
WHERE executed_at > NOW() - INTERVAL '24 hours'
  AND status = 'completed'
GROUP BY asset_in_code, asset_out_code
ORDER BY volume_24h DESC
LIMIT 20;
