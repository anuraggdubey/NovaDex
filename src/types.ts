/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Token {
  id: string;
  ticker: string;
  name: string;
  decimals: number;
  issuer?: string;
}

export interface RouteHop {
  source: string; // "SDEX Orderbook" | "Aquarius AMM" | "Anchor Rate"
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
  savedAmount: number; // versus next best single source
  savingsPercent: number;
  hopsDetails: RouteHop[];
  fingerprint: string;
  sourceType?: RouteSourceType;
  isSplit?: boolean;
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

export interface SwapRecord {
  id: string;
  timestamp: string; // ISO or date format
  fromToken: Token;
  toToken: Token;
  amountIn: number;
  amountOut: number;
  savings: number; // in output token denomination
  routePathString: string;
  status: 'Completed' | 'Reverted';
  txHash: string;
}

export interface Pool {
  id: string;
  tokenA: Token;
  tokenB: Token;
  tvl: number; // USD
  volume24h: number; // USD
  feeRate: number; // percentage, e.g. 0.3
  routingVolume: number; // NovaDEX routing volume in USD
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
