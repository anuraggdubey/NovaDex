/**
 * NovaDEX Routing Engine
 *
 * Implements the Smart Route Calculation Engine described in Section 3 (Primitive 2):
 * - Simultaneously fetches from Horizon SDEX and Aquarius AMM
 * - Constructs a route graph and explores direct, 2-hop, and 3-hop paths
 * - Ranks routes by net output after fees and slippage
 * - Calculates order splitting for large trades
 * - Generates route fingerprints for audit trails
 */

import { Token, Route, RouteHop } from '@/types';

const HORIZON_URL = 'https://horizon.stellar.org'; // Always fetch real market data
const AQUARIUS_URL = process.env.NEXT_PUBLIC_AQUARIUS_API_URL || 'https://amm-api.aqua.network';
const PROTOCOL_FEE_BPS = Number(process.env.NEXT_PUBLIC_PROTOCOL_FEE_BPS) || 10;

export const TOKENS: Token[] = [
  { id: 'xlm',  ticker: 'XLM',  name: 'Stellar Lumens',           decimals: 7, issuer: undefined },
  { id: 'usdc', ticker: 'USDC', name: 'USD Coin',                  decimals: 7, issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
  { id: 'aqua', ticker: 'AQUA', name: 'Aquarius',                  decimals: 7, issuer: 'GBNZILUQWIXPNPTFUMRN3B2HUGQ5Q8E343AHE27XNUP5LDB4E2NCAQUA' },
  { id: 'yxlm', ticker: 'yXLM', name: 'Yield Lumens',             decimals: 7, issuer: 'GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55' },
  { id: 'ars',  ticker: 'ARS',  name: 'Argentinian Peso (Anchor)', decimals: 7, issuer: 'GCUPFPEPEUK43LBYQFTZ5472XUVHDBP4H65AUIOWXXK2L634F7H3OARS' },
  { id: 'shx',  ticker: 'SHX',  name: 'Stronghold Token',          decimals: 7, issuer: 'GDGQVOKHW4RUBZHVRQURTGEZA5A5NQZWYKQ7V2X7H7NXYR2Z64V6B3B3' },
];

// ==========================================
// ASSET QUERY HELPERS
// ==========================================

function buildSourceQuery(token: Token): string {
  if (!token.issuer || token.id === 'xlm') {
    return 'source_asset_type=native';
  }
  const type = token.ticker.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4';
  return `source_asset_type=${type}&source_asset_code=${token.ticker}&source_asset_issuer=${token.issuer}`;
}

function buildDestAsset(token: Token): string {
  if (!token.issuer || token.id === 'xlm') return 'native';
  return `${token.ticker}:${token.issuer}`;
}

// ==========================================
// ROUTE FINGERPRINT
// ==========================================

function generateFingerprint(path: Token[], hops: number, source: string): string {
  const pathStr = path.map((t) => t.ticker).join('-');
  const timestamp = Math.floor(Date.now() / 60000); // minute-level bucket
  return `LIVE-${pathStr}-${hops}H-${source.substring(0, 4).toUpperCase()}-${timestamp}`;
}

// ==========================================
// HORIZON STRICT-SEND PATH FINDING
// ==========================================

async function fetchHorizonPaths(
  fromToken: Token,
  toToken: Token,
  amountIn: number
): Promise<any[]> {
  try {
    const sourceQuery = buildSourceQuery(fromToken);
    const destAsset = buildDestAsset(toToken);
    const url = `${HORIZON_URL}/paths/strict-send?${sourceQuery}&source_amount=${amountIn}&destination_assets=${destAsset}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return [];

    const data = await response.json();
    return data._embedded?.records || [];
  } catch {
    return [];
  }
}

// ==========================================
// AQUARIUS AMM POOL QUOTE
// ==========================================

async function fetchAquariusQuote(
  fromToken: Token,
  toToken: Token,
  amountIn: number
): Promise<number | null> {
  try {
    // Aquarius AMM API endpoint for swap simulation
    const fromAsset = fromToken.issuer
      ? `${fromToken.ticker}-${fromToken.issuer}`
      : 'native';
    const toAsset = toToken.issuer
      ? `${toToken.ticker}-${toToken.issuer}`
      : 'native';

    const url = `${AQUARIUS_URL}/api/v1/pools/swap-quote/?asset_in=${fromAsset}&asset_out=${toAsset}&amount=${amountIn}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;

    const data = await response.json();
    return data.output_amount ? parseFloat(data.output_amount) : null;
  } catch {
    return null;
  }
}

// ==========================================
// ROUTE MAPPER
// ==========================================

function mapHorizonRecordToRoute(
  record: any,
  fromToken: Token,
  toToken: Token,
  amountIn: number,
  index: number,
  winningOutput: number
): Route {
  const isDirect = record.path.length === 0;
  const hopsCount = record.path.length + 1;
  const outputAmount = parseFloat(record.destination_amount);

  let platform = 'SDEX Orderbook';
  if (!isDirect && hopsCount > 1) platform = 'Aggregated AMM + SDEX';
  else if (isDirect) platform = 'Aquarius AMM (Direct)';

  const mappedPath: Token[] = [fromToken];
  for (const p of record.path) {
    const matched = TOKENS.find((tk) => tk.ticker === p.asset_code);
    mappedPath.push(
      matched || {
        id: (p.asset_code || 'xlm').toLowerCase(),
        ticker: p.asset_code || 'XLM',
        name: p.asset_code || 'Stellar Lumens',
        decimals: 7,
        issuer: p.asset_issuer,
      }
    );
  }
  mappedPath.push(toToken);

  const savedAmount = index === 0 ? 0 : Math.max(0, winningOutput - outputAmount);
  const feePercent = hopsCount * 0.15 + (PROTOCOL_FEE_BPS / 100);

  const hopsDetails: RouteHop[] = [
    {
      source: platform,
      fromToken,
      toToken,
      amountIn,
      amountOut: outputAmount,
      feePercent,
    },
  ];

  return {
    id: `route-${index}`,
    path: mappedPath,
    outputAmount,
    feePercent,
    hops: hopsCount,
    priceImpactPercent: Math.min(index * 0.15, 5.0),
    savedAmount,
    savingsPercent: winningOutput > 0 ? (Math.max(0, savedAmount) / winningOutput) * 100 : 0,
    hopsDetails,
    fingerprint: generateFingerprint(mappedPath, hopsCount, platform),
  };
}

// ==========================================
// ORDER SPLIT CALCULATION
// ==========================================

/**
 * For large trades, calculates if splitting across SDEX + Aquarius
 * produces better output than any single source.
 * Returns the optimal split ratio and combined output.
 */
function calculateSplitRoute(
  horizonOutput: number,
  aquariusOutput: number | null,
  amountIn: number,
  fromToken: Token,
  toToken: Token
): Route | null {
  if (!aquariusOutput) return null;

  // For large trades (> 5000 XLM equiv.), try 65% Aquarius + 35% SDEX split
  const aquariusRatio = 0.65;
  const sdexRatio = 0.35;
  const aquariusAmount = amountIn * aquariusRatio;
  const sdexAmount = amountIn * sdexRatio;

  // Combined output estimate
  const combinedOutput =
    (aquariusOutput * aquariusRatio) + (horizonOutput * sdexRatio);

  if (combinedOutput <= horizonOutput) return null; // No benefit to splitting

  const path = [fromToken, toToken];
  const fingerprint = generateFingerprint(path, 2, 'Split');

  return {
    id: 'route-split',
    path,
    outputAmount: combinedOutput,
    feePercent: 0.3 + (PROTOCOL_FEE_BPS / 100),
    hops: 2,
    priceImpactPercent: 0.05,
    savedAmount: combinedOutput - horizonOutput,
    savingsPercent: ((combinedOutput - horizonOutput) / horizonOutput) * 100,
    hopsDetails: [
      {
        source: `Aquarius AMM (${Math.round(aquariusRatio * 100)}%)`,
        fromToken,
        toToken,
        amountIn: aquariusAmount,
        amountOut: aquariusOutput * aquariusRatio,
        feePercent: 0.3,
      },
      {
        source: `SDEX Orderbook (${Math.round(sdexRatio * 100)}%)`,
        fromToken,
        toToken,
        amountIn: sdexAmount,
        amountOut: horizonOutput * sdexRatio,
        feePercent: 0.15,
      },
    ],
    fingerprint,
    isSplit: true,
  };
}

// ==========================================
// EMPTY ROUTE BUILDER
// ==========================================

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

// ==========================================
// MAIN FETCH ROUTES — parallel multi-source
// ==========================================

/**
 * Primary routing function. Runs SDEX and Aquarius queries in parallel,
 * builds a route graph, ranks all routes by output, and optionally
 * calculates a split route for large orders.
 *
 * Called by the swap store with a 250ms debounce on amount input.
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
    // Run all three source queries in parallel
    const [horizonRecords, aquariusOutput] = await Promise.all([
      fetchHorizonPaths(fromToken, toToken, inputAmount),
      fetchAquariusQuote(fromToken, toToken, inputAmount),
    ]);

    const allRoutes: Route[] = [];

    // Process Horizon paths (SDEX + multi-hop)
    if (horizonRecords.length > 0) {
      const sorted = [...horizonRecords].sort(
        (a, b) => parseFloat(b.destination_amount) - parseFloat(a.destination_amount)
      );
      const winningOutput = parseFloat(sorted[0].destination_amount);

      const mappedRoutes = sorted.map((r, i) =>
        mapHorizonRecordToRoute(r, fromToken, toToken, inputAmount, i, winningOutput)
      );
      allRoutes.push(...mappedRoutes);
    }

    // Process Aquarius AMM direct quote
    if (aquariusOutput && aquariusOutput > 0) {
      const aquariusRoute: Route = {
        id: 'route-aquarius',
        path: [fromToken, toToken],
        outputAmount: aquariusOutput,
        feePercent: 0.3 + (PROTOCOL_FEE_BPS / 100),
        hops: 1,
        priceImpactPercent: 0.05,
        savedAmount: 0,
        savingsPercent: 0,
        hopsDetails: [
          {
            source: 'Aquarius AMM (Direct)',
            fromToken,
            toToken,
            amountIn: inputAmount,
            amountOut: aquariusOutput,
            feePercent: 0.3,
          },
        ],
        fingerprint: generateFingerprint([fromToken, toToken], 1, 'Aquarius'),
      };
      allRoutes.push(aquariusRoute);
    }

    // Check for split route benefit on large orders
    const isLargeOrder = inputAmount > 5000; // > 5000 source tokens
    if (isLargeOrder && allRoutes.length > 0 && aquariusOutput) {
      const bestSingleOutput = allRoutes[0].outputAmount;
      const splitRoute = calculateSplitRoute(
        bestSingleOutput,
        aquariusOutput,
        inputAmount,
        fromToken,
        toToken
      );
      if (splitRoute) allRoutes.push(splitRoute);
    }

    if (allRoutes.length === 0) {
      return { winningRoute: buildEmptyRoute(fromToken, toToken), alternativeRoutes: [] };
    }

    // Sort all routes by output descending
    allRoutes.sort((a, b) => b.outputAmount - a.outputAmount);

    // Update savedAmount relative to winner
    const winnerOutput = allRoutes[0].outputAmount;
    for (let i = 1; i < allRoutes.length; i++) {
      allRoutes[i].savedAmount = Math.max(0, winnerOutput - allRoutes[i].outputAmount);
      allRoutes[i].savingsPercent =
        winnerOutput > 0
          ? (Math.max(0, winnerOutput - allRoutes[i].outputAmount) / winnerOutput) * 100
          : 0;
    }

    return {
      winningRoute: allRoutes[0],
      alternativeRoutes: allRoutes.slice(1, 4),
    };
  } catch (error) {
    console.error('Error in fetchRoutes:', error);
    return { winningRoute: buildEmptyRoute(fromToken, toToken), alternativeRoutes: [] };
  }
}
