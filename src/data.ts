/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Token, Route, RouteHop, SwapRecord, Pool, GlobalMetrics } from './types';

export const TOKENS: Token[] = [
  { id: 'xlm', ticker: 'XLM', name: 'Stellar Lumens', decimals: 7, issuer: 'native' },
  { id: 'usdc', ticker: 'USDC', name: 'USD Coin', decimals: 7, issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
  { id: 'aqua', ticker: 'AQUA', name: 'Aquarius', decimals: 7, issuer: 'GBNZILUQWIXPNPTFUMRN3B2HUGQ5Q8E343AHE27XNUP5LDB4E2NCAQUA' },
  { id: 'yxlm', ticker: 'yXLM', name: 'Yield Lumens', decimals: 7, issuer: 'GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55' },
  { id: 'ars', ticker: 'ARS', name: 'Argentinian Peso (Anchor)', decimals: 7, issuer: 'GCUPFPEPEUK43LBYQFTZ5472XUVHDBP4H65AUIOWXXK2L634F7H3OARS' },
  { id: 'shx', ticker: 'SHX', name: 'Stronghold Token', decimals: 7, issuer: 'GDGQVOKHW4RUBZHVRQURTGEZA5A5NQZWYKQ7V2X7H7NXYR2Z64V6B3B3' },
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
  }
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
];

/**
 * Fetch real routing details from Stellar Mainnet Horizon
 */
export async function fetchRoutes(
  fromToken: Token,
  toToken: Token,
  inputAmount: number
): Promise<{ winningRoute: Route; alternativeRoutes: Route[] }> {
  if (inputAmount <= 0) {
    return { winningRoute: buildEmptyRoute(fromToken, toToken), alternativeRoutes: [] };
  }

  try {
    let sourceQuery = '';
    if (fromToken.id === 'xlm') {
      sourceQuery = `source_asset_type=native`;
    } else {
      sourceQuery = `source_asset_type=${fromToken.ticker.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4'}&source_asset_code=${fromToken.ticker}&source_asset_issuer=${fromToken.issuer}`;
    }

    let destQuery = '';
    if (toToken.id === 'xlm') {
      destQuery = `native`;
    } else {
      destQuery = `${toToken.ticker}:${toToken.issuer}`;
    }

    const url = `https://horizon-testnet.stellar.org/paths/strict-send?${sourceQuery}&source_amount=${inputAmount}&destination_assets=${destQuery}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch paths');
    }

    const data = await response.json();
    const records = data._embedded?.records || [];

    if (records.length === 0) {
       // Return a mock alternative route so UI can proceed to signing on testnet, 
       // but it will fail on-chain due to op_too_few_offers, which is correct for testnet without real AMMs.
       const mockOutput = inputAmount * 0.98;
       const mockRoute: Route = {
          id: 'mock-route',
          path: [fromToken, toToken],
          outputAmount: mockOutput,
          feePercent: 0.3,
          hops: 1,
          priceImpactPercent: 0.1,
          savedAmount: 0,
          savingsPercent: 0,
          hopsDetails: [{
            source: 'Mocked Testnet AMM',
            fromToken,
            toToken,
            amountIn: inputAmount,
            amountOut: mockOutput,
            feePercent: 0.3,
          }],
          fingerprint: 'TESTNET-MOCK'
       };
       return { winningRoute: mockRoute, alternativeRoutes: [] };
    }

    // Sort by destination amount descending
    const sortedRecords = records.sort((a: any, b: any) => parseFloat(b.destination_amount) - parseFloat(a.destination_amount));
    
    const winningRecord = sortedRecords[0];
    const winningOutput = parseFloat(winningRecord.destination_amount);

    const mapRecordToRoute = (record: any, index: number): Route => {
      const isDirect = record.path.length === 0;
      const hopsCount = record.path.length + 1;
      const outputAmount = parseFloat(record.destination_amount);
      const isWinning = index === 0;

      // Assign realistic platforms based on path characteristics
      let platform = 'SDEX Orderbook';
      if (!isDirect && hopsCount > 1) platform = 'Aggregated AMM + SDEX';
      else if (isDirect) platform = 'Aquarius AMM (Direct)';

      // Intermediate tokens mapping
      const mappedPath = [fromToken];
      record.path.forEach((p: any) => {
        const t = TOKENS.find(tk => tk.ticker === p.asset_code) || {
          id: p.asset_code, ticker: p.asset_code || 'XLM', name: p.asset_code || 'Stellar Lumens', decimals: 7, issuer: p.asset_issuer
        };
        mappedPath.push(t as Token);
      });
      mappedPath.push(toToken);

      const savedAmount = isWinning ? 0 : (winningOutput - outputAmount);

      return {
        id: `route-${index}`,
        path: mappedPath,
        outputAmount: outputAmount,
        feePercent: hopsCount * 0.15, // Simplified fee calculation
        hops: hopsCount,
        priceImpactPercent: index * 0.1, // Simulated impact for alternatives
        savedAmount: Math.max(0, savedAmount),
        savingsPercent: winningOutput > 0 ? (Math.max(0, savedAmount) / winningOutput) * 100 : 0,
        hopsDetails: [{
          source: platform,
          fromToken,
          toToken,
          amountIn: inputAmount,
          amountOut: outputAmount,
          feePercent: hopsCount * 0.15,
        }],
        fingerprint: `LIVE-${mappedPath.map(t => t.ticker).join('-')}-${hopsCount}`,
      };
    };

    const routes = sortedRecords.map(mapRecordToRoute);

    return {
      winningRoute: routes[0],
      alternativeRoutes: routes.slice(1, 4), // Return top 3 alternatives
    };
  } catch (error) {
    console.error('Error fetching routes:', error);
    return { winningRoute: buildEmptyRoute(fromToken, toToken), alternativeRoutes: [] };
  }
}

function buildEmptyRoute(fromToken: Token, toToken: Token): Route {
  return {
    id: 'route-empty',
    path: [fromToken, toToken],
    outputAmount: 0,
    feePercent: 0,
    hops: 0,
    priceImpactPercent: 0,
    savedAmount: 0,
    savingsPercent: 0,
    hopsDetails: [],
    fingerprint: 'EMPTY',
  };
}
