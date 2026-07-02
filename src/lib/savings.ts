import { Route } from '@/types';
import { STABLECOIN_CODES } from '@/lib/volume';

export interface SavingsUsdInput {
  savings_amount: number | string;
  asset_in_code: string;
  asset_out_code: string;
  amount_in: number | string;
  amount_out: number | string;
}

/** Typical extra output vs executing on a single DEX without aggregation (0.35%). */
const SINGLE_VENUE_FEE_PENALTY = 0.0035;

export function estimateFallbackSavings(route: Route): number {
  if (route.outputAmount <= 0) return 0;
  return route.outputAmount * SINGLE_VENUE_FEE_PENALTY;
}

/** Best quote without NovaDEX aggregation — max of best SDEX and best Aquarius single-venue routes. */
export function computeSingleVenueBaseline(routes: Route[]): number {
  const sdexBest = Math.max(0, ...routes.filter((r) => r.sourceType === 'sdex').map((r) => r.outputAmount));
  const aquaBest = Math.max(0, ...routes.filter((r) => r.sourceType === 'aquarius').map((r) => r.outputAmount));
  return Math.max(sdexBest, aquaBest);
}

export interface SavingsContext {
  sdexBest?: number;
  aquaBest?: number;
}

/** Extra output vs the next-best alternative, with a floor when only one route is quoted. */
export function savingsForRoute(route: Route, allRoutes: Route[], context?: SavingsContext): number {
  const ranked = [...allRoutes]
    .filter((r) => r.outputAmount > 0)
    .sort((a, b) => b.outputAmount - a.outputAmount);

  if (!ranked.length || route.outputAmount <= 0) return 0;

  let compared = 0;

  if (ranked.length > 1) {
    const secondBest = ranked[1]?.outputAmount ?? 0;
    const singleVenueBaseline = computeSingleVenueBaseline(ranked);
    const crossVenueSavings = singleVenueBaseline > 0 && singleVenueBaseline < route.outputAmount
      ? route.outputAmount - singleVenueBaseline
      : 0;
    const secondBestSavings = secondBest > 0 ? route.outputAmount - secondBest : 0;
    compared = Math.max(0, crossVenueSavings, secondBestSavings);
  }

  if (compared <= 0 && context) {
    const venueBaseline = Math.max(context.sdexBest ?? 0, context.aquaBest ?? 0);
    if (venueBaseline > 0 && venueBaseline < route.outputAmount) {
      compared = route.outputAmount - venueBaseline;
    }
  }

  if (compared <= 0) {
    compared = estimateFallbackSavings(route);
  }

  return compared;
}

export function applyRouteSavings(routes: Route[], context?: SavingsContext): Route[] {
  const ranked = [...routes].sort((a, b) => b.outputAmount - a.outputAmount);
  if (!ranked.length) return [];

  const winnerOutput = ranked[0].outputAmount;

  return ranked.map((route, index) => {
    const savedAmount = savingsForRoute(route, ranked, context);
    const savingsPercent = index === 0 && winnerOutput > 0
      ? (savedAmount / winnerOutput) * 100
      : winnerOutput > 0
        ? (Math.max(0, winnerOutput - route.outputAmount) / winnerOutput) * 100
        : 0;

    return { ...route, savedAmount, savingsPercent };
  });
}

/** Convert output-token savings to USD notional for storage and analytics. */
export function computeSavingsUsdc(input: SavingsUsdInput): number {
  const savings = Number(input.savings_amount || 0);
  if (savings <= 0) return 0;

  const outCode = (input.asset_out_code || '').toUpperCase();
  const inCode = (input.asset_in_code || '').toUpperCase();
  const amountOut = Number(input.amount_out || 0);
  const amountIn = Number(input.amount_in || 0);

  if (STABLECOIN_CODES.has(outCode)) return savings;
  if (STABLECOIN_CODES.has(inCode) && amountOut > 0) {
    return savings * (amountIn / amountOut);
  }
  return savings;
}

export function formatSavingsCell(
  savingsUsdc: number | string,
  _assetOutCode?: string,
): string {
  const usd = Number(savingsUsdc || 0);
  if (usd <= 0) return '—';
  return `+$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

export function formatSavingsUsd(usd: number): string {
  if (!usd || usd <= 0) return '$0.00';
  return `+$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatSavingsToken(amount: number, ticker: string): string {
  if (!amount || amount <= 0) return '—';
  return `+${amount.toFixed(4)} ${ticker}`;
}

/** Use stored savings, or estimate for legacy rows that were saved before savings tracking. */
export function effectiveSavingsUsdc(swap: {
  savings_usdc?: number | string;
  amount_out?: number | string;
  amount_in?: number | string;
  asset_in_code?: string;
  asset_out_code?: string;
  status?: string;
}): number {
  const stored = Number(swap.savings_usdc || 0);
  if (stored > 0) return stored;
  if (swap.status !== 'completed') return 0;

  const fallbackOut = estimateFallbackSavings({ outputAmount: Number(swap.amount_out || 0) } as Route);
  return computeSavingsUsdc({
    savings_amount: fallbackOut,
    asset_in_code: swap.asset_in_code || '',
    asset_out_code: swap.asset_out_code || '',
    amount_in: swap.amount_in || 0,
    amount_out: swap.amount_out || 0,
  });
}
