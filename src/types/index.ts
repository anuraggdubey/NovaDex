// NovaDEX Shared TypeScript Types — matches database schema exactly

export interface Token {
  id: string;
  ticker: string;
  name: string;
  decimals: number;
  issuer?: string; // undefined for native XLM
}

export interface RouteHop {
  source: 'SDEX Orderbook' | 'Aquarius AMM' | 'Anchor Rate' | string;
  fromToken: Token;
  toToken: Token;
  amountIn: number;
  amountOut: number;
  feePercent: number;
}

export type RouteSourceType = 'sdex' | 'aquarius' | 'split';

export interface Route {
  id: string;
  path: Token[];
  outputAmount: number;
  feePercent: number;
  hops: number;
  priceImpactPercent: number;
  savedAmount: number;  // versus best single-source direct swap
  savingsPercent: number;
  hopsDetails: RouteHop[];
  fingerprint: string;
  sourceType?: RouteSourceType;
  isSplit?: boolean;    // true for split orders
  splitLegs?: SplitLeg[];
}

export interface RouteSourceGroup {
  type: RouteSourceType;
  label: string;
  status: 'available' | 'unavailable';
  message?: string;
  routes: Route[];
}

export interface RouteSearchResult {
  winningRoute: Route;
  alternativeRoutes: Route[];
  allRoutes: Route[];
  sources: RouteSourceGroup[];
  savingsContext?: { sdexBest: number; aquaBest: number };
}

export interface SplitLeg {
  route: Route;
  amountIn: number;
  percentage: number;
}

export interface Pool {
  id: string;
  tokenA: Token;
  tokenB: Token;
  tvl: number;
  volume24h: number;
  feeRate: number;
  routingVolume: number;
  source: 'amm' | 'sdex';
  reserveAAmount?: number;
  reserveBAmount?: number;
  totalShares?: string;
  lastModified?: string;
}

export interface GlobalMetrics {
  totalVolumeUSD: number;
  totalSwapsCount: number;
  totalSavingsUSD: number;
  uniqueWalletsCount: number;
}

// --- API Response types (matches Supabase tables exactly) ---
export interface SupabaseUser {
  wallet_address: string;
  first_seen: string;
  last_seen: string;
  swap_count: number;
  total_volume_usdc: number;
  total_savings_usdc: number;
  preferred_network: 'testnet' | 'mainnet';
  created_at: string;
}

export interface SupabaseSwap {
  id: string;
  wallet_address: string;
  tx_hash: string;
  asset_in_code: string;
  asset_in_issuer: string | null;
  asset_out_code: string;
  asset_out_issuer: string | null;
  amount_in: number;
  amount_out: number;
  amount_out_direct_best: number | null;
  savings_usdc: number;
  route_fingerprint: string | null;
  route_json: object | null;
  slippage_tolerance: number;
  price_impact: number;
  protocol_fee_usdc: number;
  network: 'testnet' | 'mainnet';
  status: 'completed' | 'reverted' | 'pending';
  executed_at: string;
  created_at: string;
}

export interface SupabaseFavourite {
  id: string;
  wallet_address: string;
  asset_in_code: string;
  asset_in_issuer: string | null;
  asset_out_code: string;
  asset_out_issuer: string | null;
  label: string | null;
  created_at: string;
}

export interface SupabasePreset {
  id: string;
  wallet_address: string;
  asset_in_code: string;
  asset_in_issuer: string | null;
  asset_out_code: string;
  asset_out_issuer: string | null;
  default_amount: number;
  label: string | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
}

export interface SupabaseGlobalStats {
  id: number;
  total_volume_usdc: number;
  total_swaps: number;
  total_savings_usdc: number;
  unique_wallets: number;
  last_updated: string;
}

// --- Swap History display type (UI-friendly) ---
export interface SwapRecord {
  id: string;
  timestamp: string;
  fromToken: Token;
  toToken: Token;
  amountIn: number;
  amountOut: number;
  savings: number;
  routePathString: string;
  status: 'Completed' | 'Reverted' | 'Pending';
  txHash: string;
  network: 'testnet' | 'mainnet';
}

// --- Top pair analytics ---
export interface TopPairMetrics {
  pairString: string;
  tokenA: Token;
  tokenB: Token;
  volume24h: number;
  avgSavingsUSD: number;
  swapCount24h: number;
}
