/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Token, Route, RouteHop, SwapRecord, Pool, GlobalMetrics } from './types';

export const TOKENS: Token[] = [
  { id: 'xlm', ticker: 'XLM', name: 'Stellar Lumens', decimals: 7 },
  { id: 'usdc', ticker: 'USDC', name: 'USD Coin', decimals: 7 },
  { id: 'aqua', ticker: 'AQUA', name: 'Aquarius', decimals: 7 },
  { id: 'yxlm', ticker: 'yXLM', name: 'Yield Lumens', decimals: 7 },
  { id: 'ars', ticker: 'ARS', name: 'Argentinian Peso (Anchor)', decimals: 7 },
  { id: 'shx', ticker: 'SHX', name: 'Stronghold Token', decimals: 7 },
];

export const MOCK_GLOBAL_METRICS: GlobalMetrics = {
  totalVolumeUSD: 14209584.50,
  totalSwapsCount: 284105,
  totalSavingsUSD: 312056.80,
  uniqueWalletsCount: 18451,
};

export const MOCK_POOLS: Pool[] = [
  {
    id: 'xlm-usdc',
    tokenA: TOKENS[0], // XLM
    tokenB: TOKENS[1], // USDC
    tvl: 4500000,
    volume24h: 382400,
    feeRate: 0.3,
    routingVolume: 215300,
  },
  {
    id: 'xlm-aqua',
    tokenA: TOKENS[0], // XLM
    tokenB: TOKENS[2], // AQUA
    tvl: 1850000,
    volume24h: 195200,
    feeRate: 0.3,
    routingVolume: 125800,
  },
  {
    id: 'usdc-aqua',
    tokenA: TOKENS[1], // USDC
    tokenB: TOKENS[2], // AQUA
    tvl: 1200000,
    volume24h: 94100,
    feeRate: 0.3,
    routingVolume: 61200,
  },
  {
    id: 'xlm-yxlm',
    tokenA: TOKENS[0], // XLM
    tokenB: TOKENS[3], // yXLM
    tvl: 2100000,
    volume24h: 154000,
    feeRate: 0.1,
    routingVolume: 92400,
  },
  {
    id: 'xlm-ars',
    tokenA: TOKENS[0], // XLM
    tokenB: TOKENS[4], // ARS
    tvl: 850000,
    volume24h: 41900,
    feeRate: 0.3,
    routingVolume: 24300,
  },
  {
    id: 'usdc-shx',
    tokenA: TOKENS[1], // USDC
    tokenB: TOKENS[5], // SHX
    tvl: 420000,
    volume24h: 12800,
    feeRate: 0.3,
    routingVolume: 7100,
  },
];

export const MOCK_SWAP_HISTORY: SwapRecord[] = [
  {
    id: 'tx-28a1',
    timestamp: '2026-06-14T11:45:12Z',
    fromToken: TOKENS[0], // XLM
    toToken: TOKENS[1], // USDC
    amountIn: 1000.00,
    amountOut: 118.42,
    savings: 1.84,
    routePathString: 'XLM → AQUA → USDC',
    status: 'Completed',
    txHash: '9b7d8d21c322b72458fed9dcaef3a557bc1bc88a536ebd8cf3b63cc3eb8c3f4e',
  },
  {
    id: 'tx-28a2',
    timestamp: '2026-06-14T09:12:05Z',
    fromToken: TOKENS[2], // AQUA
    toToken: TOKENS[0], // XLM
    amountIn: 5000.00,
    amountOut: 425.10,
    savings: 3.92,
    routePathString: 'AQUA → XLM',
    status: 'Completed',
    txHash: 'e69cda4efc0ad83ab2db3da82c3f8cb2184ffbe321300ceab8a764dff4ad2402',
  },
  {
    id: 'tx-28b9',
    timestamp: '2026-06-13T17:22:45Z',
    fromToken: TOKENS[1], // USDC
    toToken: TOKENS[4], // ARS
    amountIn: 50.00,
    amountOut: 44250.00,
    savings: 180.20,
    routePathString: 'USDC → XLM → ARS',
    status: 'Completed',
    txHash: '48f7d98cfa76e9db8caef32a4e4be3287d3a24b10b8cf93ab87cfdf3be7df695',
  },
  {
    id: 'tx-28c0',
    timestamp: '2026-06-13T13:05:19Z',
    fromToken: TOKENS[0], // XLM
    toToken: TOKENS[3], // yXLM
    amountIn: 25000.00,
    amountOut: 24982.50,
    savings: 12.40,
    routePathString: 'XLM → yXLM',
    status: 'Completed',
    txHash: '20def9ca8af7cdab8ca87fa67efdf38d2f780dcbcabb89cb7ef8e7bdced87d6e',
  },
  {
    id: 'tx-28c1',
    timestamp: '2026-06-12T22:18:14Z',
    fromToken: TOKENS[1], // USDC
    toToken: TOKENS[5], // SHX
    amountIn: 200.00,
    amountOut: 8412.00,
    savings: 0.00,
    routePathString: 'USDC → SHX',
    status: 'Reverted',
    txHash: 'efefea777aeecdaefdaea38fc280ba837cb87a6dcf88fbe3ea39db7f09daed11',
  },
  {
    id: 'tx-28c2',
    timestamp: '2026-06-11T14:40:02Z',
    fromToken: TOKENS[2], // AQUA
    toToken: TOKENS[1], // USDC
    amountIn: 12000.00,
    amountOut: 284.15,
    savings: 6.82,
    routePathString: 'AQUA → XLM → USDC',
    status: 'Completed',
    txHash: '32fcba7631ed9a8fbc8a2135dc8f9cbeab3fe761da120cebcabb93df6eed29a6',
  },
];

export interface TopPairMetrics {
  pairString: string;
  tokenA: Token;
  tokenB: Token;
  volume24h: number;
  avgSavingsUSD: number;
  swapCount24h: number;
}

export const MOCK_TOP_PAIRS: TopPairMetrics[] = [
  { pairString: 'XLM / USDC', tokenA: TOKENS[0], tokenB: TOKENS[1], volume24h: 382400, avgSavingsUSD: 4.25, swapCount24h: 1842 },
  { pairString: 'XLM / AQUA', tokenA: TOKENS[0], tokenB: TOKENS[2], volume24h: 195200, avgSavingsUSD: 7.10, swapCount24h: 1203 },
  { pairString: 'USDC / AQUA', tokenA: TOKENS[1], tokenB: TOKENS[2], volume24h: 94100, avgSavingsUSD: 3.85, swapCount24h: 402 },
  { pairString: 'XLM / yXLM', tokenA: TOKENS[0], tokenB: TOKENS[3], volume24h: 154000, avgSavingsUSD: 1.15, swapCount24h: 945 },
  { pairString: 'XLM / ARS', tokenA: TOKENS[0], tokenB: TOKENS[4], volume24h: 41900, avgSavingsUSD: 14.50, swapCount24h: 211 },
];

/**
 * High-fidelity Route Calculation Mock Engine matching the user description:
 * - Direct source representation vs Multi-source optimized paths
 * - Calculates different pricing pathways, output rates, fee and slippage dynamics based on Order Size
 */
export function calculateRoutes(
  fromToken: Token,
  toToken: Token,
  inputAmount: number
): { winningRoute: Route; alternativeRoutes: Route[] } {
  // Mock conversion rate logic helper
  // Base values in some abstract XLM standard
  const baseRates: { [key: string]: number } = {
    xlm: 1.0,
    usdc: 0.12,  // 1 XLM = 0.12 USDC
    aqua: 6.20,  // 1 XLM = 6.2 AQUA
    yxlm: 0.995, // 1 XLM = 0.995 yXLM
    ars: 110.0,  // 1 XLM = 110 ARS
    shx: 42.0,   // 1 XLM = 42 SHX
  };

  const rateFrom = baseRates[fromToken.id] || 1;
  const rateTo = baseRates[toToken.id] || 1;

  // Ideal conversion factor: (1 / rateFrom) * rateTo
  const conversionFactor = rateTo / rateFrom;
  const baseIdealOutput = inputAmount * conversionFactor;

  // Determine pricing impact based on order size (inputAmount converted roughly to USD/XLM equivalent scale)
  const sizeXlmEquivalent = inputAmount / rateFrom;
  let priceImpact = 0.05; // Base 0.05%
  
  if (sizeXlmEquivalent > 100 && sizeXlmEquivalent <= 2000) {
    priceImpact = 0.12 + (sizeXlmEquivalent / 2000) * 0.5;
  } else if (sizeXlmEquivalent > 2000 && sizeXlmEquivalent <= 20000) {
    priceImpact = 0.70 + (sizeXlmEquivalent / 20000) * 2.1;
  } else if (sizeXlmEquivalent > 20000) {
    priceImpact = 2.8 + Math.min((sizeXlmEquivalent / 100000) * 5.0, 10.0);
  }

  // Generate Winning Optimized Route: Often multi-hop (unless direct is inherently superior like XLM <-> yXLM)
  const isDirectPreferable = (fromToken.id === 'xlm' && toToken.id === 'yxlm') || 
                             (fromToken.id === 'yxlm' && toToken.id === 'xlm') ||
                             inputAmount === 0;

  // Build winning route path
  let winningPath: Token[] = [fromToken, toToken];
  let hopsCount = 1;
  let winningSource = "SDEX Orderbook";

  if (!isDirectPreferable && fromToken.id !== toToken.id) {
    // Inject a helpful intermediate liquidity source if not direct
    const intermediate = TOKENS.find(t => t.id !== fromToken.id && t.id !== toToken.id && (t.id === 'xlm' || t.id === 'aqua'));
    if (intermediate) {
      winningPath = [fromToken, intermediate, toToken];
      hopsCount = 2;
    }
  }

  // Calculate optimized output
  // Multi-source routing wins, giving a 0.2% - 2.5% better price than the direct path
  const routingOptimizationFactor = isDirectPreferable ? 0.0 : Math.min(0.002 + (sizeXlmEquivalent / 40000) * 0.015, 0.024);
  
  // Winning output has less price impact thanks to path split
  const winningPriceImpact = priceImpact * (isDirectPreferable ? 1.0 : 0.65);
  const winningOutput = baseIdealOutput * (1 - winningPriceImpact / 100) * (1 + routingOptimizationFactor);

  // Generate realistic hops details
  const hopsDetails: RouteHop[] = [];
  if (winningPath.length === 2 && inputAmount > 0) {
    hopsDetails.push({
      source: "SDEX Orderbook",
      fromToken: winningPath[0],
      toToken: winningPath[1],
      amountIn: inputAmount,
      amountOut: winningOutput,
      feePercent: 0.15,
    });
  } else if (winningPath.length === 3 && inputAmount > 0) {
    const interAmount = inputAmount * (baseRates[winningPath[1].id] / rateFrom) * (1 - winningPriceImpact / 150);
    hopsDetails.push({
      source: "Aquarius AMM Pool",
      fromToken: winningPath[0],
      toToken: winningPath[1],
      amountIn: inputAmount,
      amountOut: interAmount,
      feePercent: 0.10,
    });
    hopsDetails.push({
      source: "SDEX Orderbook",
      fromToken: winningPath[1],
      toToken: winningPath[2],
      amountIn: interAmount,
      amountOut: winningOutput,
      feePercent: 0.15,
    });
  }

  const savedAmount = isDirectPreferable ? 0.0 : winningOutput * routingOptimizationFactor;
  const savingsPercent = isDirectPreferable ? 0.0 : routingOptimizationFactor * 100;

  const fingerprint = winningPath.map(t => t.ticker).join('-') + '-' + (hopsCount * 4);

  const winningRoute: Route = {
    id: 'route-win',
    path: winningPath,
    outputAmount: inputAmount === 0 ? 0 : winningOutput,
    feePercent: hopsCount === 2 ? 0.25 : 0.15,
    hops: hopsCount,
    priceImpactPercent: inputAmount === 0 ? 0 : winningPriceImpact,
    savedAmount: inputAmount === 0 ? 0 : savedAmount,
    savingsPercent: inputAmount === 0 ? 0 : savingsPercent,
    hopsDetails,
    fingerprint,
  };

  // Build Alternate Route 1: Direct SDEX order book swap (usually worse)
  const alt1Output = baseIdealOutput * (1 - priceImpact / 100);
  const alt1Route: Route = {
    id: 'route-alt-1',
    path: [fromToken, toToken],
    outputAmount: inputAmount === 0 ? 0 : alt1Output,
    feePercent: 0.30,
    hops: 1,
    priceImpactPercent: inputAmount === 0 ? 0 : priceImpact,
    savedAmount: 0,
    savingsPercent: 0,
    hopsDetails: inputAmount === 0 ? [] : [{
      source: "SDEX Orderbook (Direct)",
      fromToken,
      toToken,
      amountIn: inputAmount,
      amountOut: alt1Output,
      feePercent: 0.30,
    }],
    fingerprint: `${fromToken.ticker}-${toToken.ticker}-D1`,
  };

  // Build Alternate Route 2: AMM exclusive route (usually split differently)
  const alt2PriceImpact = priceImpact * 1.35; // worse liquidity block
  const alt2Output = baseIdealOutput * (1 - alt2PriceImpact / 100);
  const alt2Route: Route = {
    id: 'route-alt-2',
    path: [fromToken, toToken],
    outputAmount: inputAmount === 0 ? 0 : alt2Output,
    feePercent: 0.30,
    hops: 1,
    priceImpactPercent: inputAmount === 0 ? 0 : alt2PriceImpact,
    savedAmount: 0,
    savingsPercent: 0,
    hopsDetails: inputAmount === 0 ? [] : [{
      source: "Aquarius AMM (Direct)",
      fromToken,
      toToken,
      amountIn: inputAmount,
      amountOut: alt2Output,
      feePercent: 0.30,
    }],
    fingerprint: `${fromToken.ticker}-${toToken.ticker}-A1`,
  };

  return {
    winningRoute,
    alternativeRoutes: isDirectPreferable ? [] : [alt1Route, alt2Route],
  };
}
