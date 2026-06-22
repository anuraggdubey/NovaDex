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
}

export interface GlobalMetrics {
  totalVolumeUSD: number;
  totalSwapsCount: number;
  totalSavingsUSD: number;
  uniqueWalletsCount: number;
}
