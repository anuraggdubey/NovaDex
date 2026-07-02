/**
 * NovaDEX Routing Engine
 *
 * Fetches routes from three independent sources in parallel:
 * 1. SDEX (Horizon path finding + order book fallback)
 * 2. Aquarius AMM (API on mainnet, Horizon liquidity pools on testnet)
 * 3. Split orders (SDEX + Aquarius combined)
 */

import { Token, Route, RouteHop, RouteSearchResult, RouteSourceGroup, RouteSourceType } from '@/types';
import { applyRouteSavings } from '@/lib/savings';

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const AQUARIUS_URL = process.env.NEXT_PUBLIC_AQUARIUS_API_URL || 'https://amm-api.aqua.network';
const PROTOCOL_FEE_BPS = Number(process.env.NEXT_PUBLIC_PROTOCOL_FEE_BPS) || 10;
const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
const POOL_FEE = 0.003;

const MAINNET_TOKENS: Token[] = [
  { id: 'xlm',  ticker: 'XLM',  name: 'Stellar Lumens',           decimals: 7, issuer: undefined },
  { id: 'usdc', ticker: 'USDC', name: 'USD Coin',                  decimals: 7, issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
  { id: 'aqua', ticker: 'AQUA', name: 'Aquarius',                  decimals: 7, issuer: 'GBNZILUQWIXPNPTFUMRN3B2HUGQ5Q8E343AHE27XNUP5LDB4E2NCAQUA' },
  { id: 'yxlm', ticker: 'yXLM', name: 'Yield Lumens',             decimals: 7, issuer: 'GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55' },
  { id: 'ars',  ticker: 'ARS',  name: 'Argentinian Peso (Anchor)', decimals: 7, issuer: 'GCUPFPEPEUK43LBYQFTZ5472XUVHDBP4H65AUIOWXXK2L634F7H3OARS' },
  { id: 'shx',  ticker: 'SHX',  name: 'Stronghold Token',          decimals: 7, issuer: 'GDGQVOKHW4RUBZHVRQURTGEZA5A5NQZWYKQ7V2X7H7NXYR2Z64V6B3B3' },
];

const TESTNET_ISSUER = process.env.NEXT_PUBLIC_TESTNET_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const TESTNET_TOKENS: Token[] = [
  { id: 'xlm',  ticker: 'XLM',  name: 'Stellar Lumens',           decimals: 7, issuer: undefined },
  { id: 'usdc', ticker: 'USDC', name: 'USD Coin (Testnet)',        decimals: 7, issuer: TESTNET_ISSUER },
  { id: 'aqua', ticker: 'AQUA', name: 'Aquarius (Testnet)',        decimals: 7, issuer: TESTNET_ISSUER },
  { id: 'yxlm', ticker: 'yXLM', name: 'Yield Lumens (Testnet)',   decimals: 7, issuer: TESTNET_ISSUER },
  { id: 'ars',  ticker: 'ARS',  name: 'ARS (Testnet)',             decimals: 7, issuer: TESTNET_ISSUER },
  { id: 'shx',  ticker: 'SHX',  name: 'Stronghold (Testnet)',      decimals: 7, issuer: TESTNET_ISSUER },
];

export const TOKENS: Token[] = STELLAR_NETWORK === 'mainnet' ? MAINNET_TOKENS : TESTNET_TOKENS;

function buildSourceQuery(token: Token): string {
  if (!token.issuer || token.id === 'xlm') return 'source_asset_type=native';
  const type = token.ticker.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4';
  return `source_asset_type=${type}&source_asset_code=${token.ticker}&source_asset_issuer=${token.issuer}`;
}

function buildDestAsset(token: Token): string {
  if (!token.issuer || token.id === 'xlm') return 'native';
  return `${token.ticker}:${token.issuer}`;
}

function reserveAssetString(token: Token): string {
  if (!token.issuer || token.id === 'xlm') return 'native';
  return `${token.ticker}:${token.issuer}`;
}

function normalizePoolAsset(asset: string): string {
  return asset === 'native' ? 'native' : asset;
}

function matchesDestination(record: any, toToken: Token): boolean {
  if (toToken.id === 'xlm') return record.destination_asset_type === 'native';
  return (
    record.destination_asset_type !== 'native' &&
    record.destination_asset_code === toToken.ticker &&
    record.destination_asset_issuer === toToken.issuer
  );
}

function mapPathTokens(record: any, fromToken: Token, toToken: Token): Token[] {
  const mappedPath: Token[] = [fromToken];
  for (const p of record.path || []) {
    const matched = TOKENS.find((tk) => tk.ticker === p.asset_code);
    mappedPath.push(
      matched || {
        id: (p.asset_code || 'xlm').toLowerCase(),
        ticker: p.asset_code || 'XLM',
        name: p.asset_code || 'Stellar Lumens',
        decimals: 7,
        issuer: p.asset_issuer,
      },
    );
  }
  mappedPath.push(toToken);
  return mappedPath;
}

function generateFingerprint(path: Token[], hops: number, source: string): string {
  return `${source}-${path.map((t) => t.ticker).join('-')}-${hops}H`;
}

function buildRoute(params: {
  id: string;
  sourceType: RouteSourceType;
  path: Token[];
  outputAmount: number;
  amountIn: number;
  fromToken: Token;
  toToken: Token;
  hops: number;
  sourceLabel: string;
  feePercent?: number;
  priceImpactPercent?: number;
  isSplit?: boolean;
  hopsDetails?: RouteHop[];
}): Route {
  const {
    id, sourceType, path, outputAmount, amountIn, fromToken, toToken, hops, sourceLabel,
    feePercent = hops * 0.15 + PROTOCOL_FEE_BPS / 100,
    priceImpactPercent = Math.min(hops * 0.12, 5),
    isSplit = false,
    hopsDetails,
  } = params;

  return {
    id,
    path,
    outputAmount,
    feePercent,
    hops,
    priceImpactPercent,
    savedAmount: 0,
    savingsPercent: 0,
    sourceType,
    isSplit,
    hopsDetails: hopsDetails || [{
      source: sourceLabel,
      fromToken,
      toToken,
      amountIn,
      amountOut: outputAmount,
      feePercent,
    }],
    fingerprint: generateFingerprint(path, hops, sourceLabel),
  };
}

// --- SDEX: Horizon strict-send paths (filtered to actual destination token) ---

async function fetchHorizonPaths(fromToken: Token, toToken: Token, amountIn: number): Promise<any[]> {
  try {
    const url = `${HORIZON_URL}/paths/strict-send?${buildSourceQuery(fromToken)}&source_amount=${amountIn.toFixed(7)}&destination_assets=${buildDestAsset(toToken)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const records: any[] = (await response.json())._embedded?.records || [];
    return records.filter((r) => matchesDestination(r, toToken));
  } catch {
    return [];
  }
}

function mapHorizonRecordToRoute(record: any, fromToken: Token, toToken: Token, amountIn: number, index: number): Route {
  const hopsCount = (record.path?.length || 0) + 1;
  const mappedPath = mapPathTokens(record, fromToken, toToken);
  const isMultiHop = hopsCount > 1;
  return buildRoute({
    id: `route-sdex-path-${index}-${mappedPath.map((t) => t.ticker).join('-')}`,
    sourceType: 'sdex',
    path: mappedPath,
    outputAmount: parseFloat(record.destination_amount),
    amountIn,
    fromToken,
    toToken,
    hops: hopsCount,
    sourceLabel: isMultiHop ? 'SDEX Multi-hop' : 'SDEX Orderbook',
    priceImpactPercent: Math.min(index * 0.1 + 0.05, 5),
  });
}

// --- SDEX: Order book walk (forward bids, then reverse asks) ---

function walkForwardBids(bids: any[], amountIn: number): number {
  let remaining = amountIn;
  let totalOut = 0;
  for (const bid of bids) {
    const price = parseFloat(bid.price);
    const bidAmount = parseFloat(bid.amount);
    if (!price || !bidAmount) continue;
    const take = Math.min(remaining, bidAmount);
    totalOut += take * price;
    remaining -= take;
    if (remaining <= 0.0000001) break;
  }
  return remaining <= amountIn * 0.001 ? totalOut : 0;
}

function walkReverseAsks(asks: any[], amountIn: number): number {
  let remainingXlm = amountIn;
  let totalOut = 0;
  for (const ask of asks) {
    const price = parseFloat(ask.price);
    const offerAmount = parseFloat(ask.amount);
    if (!price || !offerAmount) continue;
    const xlmNeeded = offerAmount * price;
    const xlmSpend = Math.min(remainingXlm, xlmNeeded);
    totalOut += xlmSpend / price;
    remainingXlm -= xlmSpend;
    if (remainingXlm <= 0.0000001) break;
  }
  return remainingXlm <= amountIn * 0.001 ? totalOut : 0;
}

async function fetchOrderBookRoute(fromToken: Token, toToken: Token, amountIn: number): Promise<Route | null> {
  try {
    const forward = new URLSearchParams();
    if (!fromToken.issuer || fromToken.id === 'xlm') {
      forward.set('selling_asset_type', 'native');
    } else {
      forward.set('selling_asset_type', fromToken.ticker.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4');
      forward.set('selling_asset_code', fromToken.ticker);
      forward.set('selling_asset_issuer', fromToken.issuer);
    }
    if (!toToken.issuer || toToken.id === 'xlm') {
      forward.set('buying_asset_type', 'native');
    } else {
      forward.set('buying_asset_type', toToken.ticker.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4');
      forward.set('buying_asset_code', toToken.ticker);
      forward.set('buying_asset_issuer', toToken.issuer);
    }
    forward.set('limit', '25');

    const forwardRes = await fetch(`${HORIZON_URL}/order_book?${forward}`, { signal: AbortSignal.timeout(8000) });
    let totalOut = 0;
    if (forwardRes.ok) {
      const bids = (await forwardRes.json()).bids || [];
      totalOut = walkForwardBids(bids, amountIn);
    }

    if (totalOut <= 0) {
      const reverse = new URLSearchParams();
      if (!toToken.issuer || toToken.id === 'xlm') {
        reverse.set('selling_asset_type', 'native');
      } else {
        reverse.set('selling_asset_type', toToken.ticker.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4');
        reverse.set('selling_asset_code', toToken.ticker);
        reverse.set('selling_asset_issuer', toToken.issuer);
      }
      if (!fromToken.issuer || fromToken.id === 'xlm') {
        reverse.set('buying_asset_type', 'native');
      } else {
        reverse.set('buying_asset_type', fromToken.ticker.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4');
        reverse.set('buying_asset_code', fromToken.ticker);
        reverse.set('buying_asset_issuer', fromToken.issuer);
      }
      reverse.set('limit', '25');

      const reverseRes = await fetch(`${HORIZON_URL}/order_book?${reverse}`, { signal: AbortSignal.timeout(8000) });
      if (reverseRes.ok) {
        const asks = (await reverseRes.json()).asks || [];
        totalOut = walkReverseAsks(asks, amountIn);
      }
    }

    if (totalOut <= 0) return null;

    return buildRoute({
      id: `route-sdex-orderbook-${fromToken.ticker}-${toToken.ticker}`,
      sourceType: 'sdex',
      path: [fromToken, toToken],
      outputAmount: totalOut,
      amountIn,
      fromToken,
      toToken,
      hops: 1,
      sourceLabel: 'SDEX Orderbook',
      priceImpactPercent: 0.08,
    });
  } catch {
    return null;
  }
}

// --- Aquarius: mainnet API ---

async function fetchAquariusApiQuote(fromToken: Token, toToken: Token, amountIn: number): Promise<number | null> {
  if (STELLAR_NETWORK === 'testnet') return null;
  try {
    const fromAsset = fromToken.issuer ? `${fromToken.ticker}-${fromToken.issuer}` : 'native';
    const toAsset = toToken.issuer ? `${toToken.ticker}-${toToken.issuer}` : 'native';
    const url = `${AQUARIUS_URL}/api/v1/pools/swap-quote/?asset_in=${fromAsset}&asset_out=${toAsset}&amount=${amountIn}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const output = parseFloat((await response.json()).output_amount);
    return output > 0 ? output : null;
  } catch {
    return null;
  }
}

// --- Aquarius: Horizon AMM liquidity pools (works on testnet) ---

function computeAmmOutput(amountIn: number, reserveIn: number, reserveOut: number): number {
  const amountInWithFee = amountIn * (1 - POOL_FEE);
  return (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
}

async function fetchHorizonPoolRoute(fromToken: Token, toToken: Token, amountIn: number): Promise<Route | null> {
  try {
    const reserveA = reserveAssetString(fromToken);
    const reserveB = reserveAssetString(toToken);
    const urls = [
      `${HORIZON_URL}/liquidity_pools?reserves=${reserveA},${reserveB}&limit=1`,
      `${HORIZON_URL}/liquidity_pools?reserves=${reserveB},${reserveA}&limit=1`,
    ];

    for (const url of urls) {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) continue;

      const pool = (await response.json())._embedded?.records?.[0];
      if (!pool?.reserves || pool.reserves.length !== 2) continue;

      const fromKey = reserveAssetString(fromToken);
      const toKey = reserveAssetString(toToken);

      let reserveIn = 0;
      let reserveOut = 0;
      for (const reserve of pool.reserves) {
        const key = normalizePoolAsset(reserve.asset);
        const amt = parseFloat(reserve.amount);
        if (key === fromKey) reserveIn = amt;
        if (key === toKey) reserveOut = amt;
      }

      if (reserveIn <= 0 || reserveOut <= 0) continue;

      const outputAmount = computeAmmOutput(amountIn, reserveIn, reserveOut);
      if (outputAmount <= 0) continue;

      return buildRoute({
        id: `route-aquarius-pool-${fromToken.ticker}-${toToken.ticker}`,
        sourceType: 'aquarius',
        path: [fromToken, toToken],
        outputAmount,
        amountIn,
        fromToken,
        toToken,
        hops: 1,
        sourceLabel: STELLAR_NETWORK === 'testnet' ? 'Aquarius AMM (Testnet Pool)' : 'Aquarius AMM (Pool)',
        feePercent: POOL_FEE * 100 + PROTOCOL_FEE_BPS / 100,
        priceImpactPercent: Math.min((amountIn / (reserveIn + amountIn)) * 100, 5),
      });
    }
    return null;
  } catch {
    return null;
  }
}

function buildAquariusRoute(outputAmount: number, fromToken: Token, toToken: Token, amountIn: number, sourceLabel: string, idSuffix: string): Route {
  return buildRoute({
    id: `route-aquarius-${idSuffix}-${fromToken.ticker}-${toToken.ticker}`,
    sourceType: 'aquarius',
    path: [fromToken, toToken],
    outputAmount,
    amountIn,
    fromToken,
    toToken,
    hops: 1,
    sourceLabel,
    feePercent: 0.3 + PROTOCOL_FEE_BPS / 100,
    priceImpactPercent: 0.08,
  });
}

function buildSplitRoute(sdexOutput: number, aquariusOutput: number, amountIn: number, fromToken: Token, toToken: Token): Route {
  const aquariusRatio = 0.65;
  const sdexRatio = 0.35;
  const path = [fromToken, toToken];
  return {
    id: `route-split-${fromToken.ticker}-${toToken.ticker}`,
    sourceType: 'split',
    path,
    outputAmount: aquariusOutput * aquariusRatio + sdexOutput * sdexRatio,
    feePercent: 0.25 + PROTOCOL_FEE_BPS / 100,
    hops: 2,
    priceImpactPercent: 0.06,
    savedAmount: 0,
    savingsPercent: 0,
    isSplit: true,
    hopsDetails: [
      { source: `Aquarius AMM (${Math.round(aquariusRatio * 100)}%)`, fromToken, toToken, amountIn: amountIn * aquariusRatio, amountOut: aquariusOutput * aquariusRatio, feePercent: 0.3 },
      { source: `SDEX Orderbook (${Math.round(sdexRatio * 100)}%)`, fromToken, toToken, amountIn: amountIn * sdexRatio, amountOut: sdexOutput * sdexRatio, feePercent: 0.15 },
    ],
    fingerprint: generateFingerprint(path, 2, 'Split'),
  };
}

function dedupeRoutes(routes: Route[]): Route[] {
  const seen = new Set<string>();
  return routes.filter((route) => {
    const key = `${route.sourceType}-${route.id}`;
    if (seen.has(key) || route.outputAmount <= 0) return false;
    seen.add(key);
    return true;
  });
}

function finalizeRoutes(routes: Route[], context?: { sdexBest: number; aquaBest: number }): Route[] {
  const deduped = dedupeRoutes(routes);
  return applyRouteSavings(deduped, context);
}

function buildEmptyRoute(fromToken: Token, toToken: Token): Route {
  return { id: 'route-empty', path: [fromToken, toToken], outputAmount: 0, feePercent: 0, hops: 0, priceImpactPercent: 0, savedAmount: 0, savingsPercent: 0, hopsDetails: [], fingerprint: 'EMPTY' };
}

function bestOutput(routes: Route[]): number {
  return routes.length ? Math.max(...routes.map((r) => r.outputAmount)) : 0;
}

function isPlausibleOutput(fromToken: Token, toToken: Token, amountIn: number, output: number): boolean {
  if (output <= 0 || amountIn <= 0) return false;
  const rate = output / amountIn;

  if (fromToken.id === 'xlm' && toToken.ticker === 'USDC') {
    return rate >= 0.02 && rate <= 0.8;
  }
  if (fromToken.ticker === 'USDC' && toToken.id === 'xlm') {
    return rate >= 1.5 && rate <= 50;
  }
  return true;
}

function filterPlausibleRoutes(routes: Route[], fromToken: Token, toToken: Token): Route[] {
  return routes.filter((r) => isPlausibleOutput(fromToken, toToken, r.hopsDetails[0]?.amountIn ?? 0, r.outputAmount));
}

function mergeUniqueRoutes(existing: Route[], incoming: Route | null): Route[] {
  if (!incoming) return existing;
  const dup = existing.some((r) => Math.abs(r.outputAmount - incoming.outputAmount) < 0.0001 && r.sourceType === incoming.sourceType);
  return dup ? existing : [...existing, incoming];
}

const EMPTY_SOURCES: RouteSourceGroup[] = [
  { type: 'sdex', label: 'SDEX Orderbook', status: 'unavailable', message: 'Enter an amount to search', routes: [] },
  { type: 'aquarius', label: 'Aquarius AMM', status: 'unavailable', message: 'Enter an amount to search', routes: [] },
  { type: 'split', label: 'Split Order', status: 'unavailable', message: 'Requires both SDEX and Aquarius', routes: [] },
];

export async function fetchRoutes(fromToken: Token, toToken: Token, inputAmount: number): Promise<RouteSearchResult> {
  const empty = buildEmptyRoute(fromToken, toToken);
  if (inputAmount <= 0) return { winningRoute: empty, alternativeRoutes: [], allRoutes: [], sources: EMPTY_SOURCES };

  try {
    const [horizonRecords, aquariusApiOutput, orderBookRoute, poolRoute] = await Promise.all([
      fetchHorizonPaths(fromToken, toToken, inputAmount),
      fetchAquariusApiQuote(fromToken, toToken, inputAmount),
      fetchOrderBookRoute(fromToken, toToken, inputAmount),
      fetchHorizonPoolRoute(fromToken, toToken, inputAmount),
    ]);

    let sdexRoutes: Route[] = [];
    if (horizonRecords.length > 0) {
      const sorted = [...horizonRecords].sort((a, b) => parseFloat(b.destination_amount) - parseFloat(a.destination_amount));
      sdexRoutes = sorted.map((r, i) => mapHorizonRecordToRoute(r, fromToken, toToken, inputAmount, i));
    }
    sdexRoutes = mergeUniqueRoutes(sdexRoutes, orderBookRoute);
    sdexRoutes = filterPlausibleRoutes(sdexRoutes, fromToken, toToken);

    let aquariusRoutes: Route[] = [];
    if (aquariusApiOutput) {
      aquariusRoutes.push(buildAquariusRoute(aquariusApiOutput, fromToken, toToken, inputAmount, 'Aquarius AMM (API)', 'api'));
    }
    aquariusRoutes = mergeUniqueRoutes(aquariusRoutes, poolRoute);
    aquariusRoutes = filterPlausibleRoutes(aquariusRoutes, fromToken, toToken);

    const sdexBest = bestOutput(sdexRoutes);
    const aquaBest = bestOutput(aquariusRoutes);
    const savingsContext = { sdexBest, aquaBest };
    const splitRoutes: Route[] = sdexBest > 0 && aquaBest > 0
      ? [buildSplitRoute(sdexBest, aquaBest, inputAmount, fromToken, toToken)]
      : [];

    const sources: RouteSourceGroup[] = [
      {
        type: 'sdex',
        label: 'SDEX Orderbook',
        status: sdexRoutes.length ? 'available' : 'unavailable',
        message: sdexRoutes.length ? undefined : 'No SDEX liquidity on Horizon for this pair',
        routes: [...sdexRoutes].sort((a, b) => b.outputAmount - a.outputAmount),
      },
      {
        type: 'aquarius',
        label: 'Aquarius AMM',
        status: aquariusRoutes.length ? 'available' : 'unavailable',
        message: aquariusRoutes.length
          ? undefined
          : STELLAR_NETWORK === 'testnet'
            ? 'No testnet AMM pool found — deposit liquidity or run setup-testnet-liquidity.mjs'
            : 'No Aquarius pool quote available for this pair',
        routes: [...aquariusRoutes].sort((a, b) => b.outputAmount - a.outputAmount),
      },
      {
        type: 'split',
        label: 'Split Order',
        status: splitRoutes.length ? 'available' : 'unavailable',
        message: splitRoutes.length
          ? '65% Aquarius + 35% SDEX combined execution'
          : 'Split unavailable — needs both SDEX and Aquarius liquidity',
        routes: splitRoutes,
      },
    ];

    const candidates = [...sdexRoutes, ...aquariusRoutes, ...splitRoutes];
    if (!candidates.length) return { winningRoute: empty, alternativeRoutes: [], allRoutes: [], sources };

    const ranked = finalizeRoutes(candidates, savingsContext);
    return { winningRoute: ranked[0], alternativeRoutes: ranked.slice(1), allRoutes: ranked, sources, savingsContext };
  } catch (error) {
    console.error('Error in fetchRoutes:', error);
    return {
      winningRoute: empty,
      alternativeRoutes: [],
      allRoutes: [],
      sources: [
        { type: 'sdex', label: 'SDEX Orderbook', status: 'unavailable', message: 'Route search failed', routes: [] },
        { type: 'aquarius', label: 'Aquarius AMM', status: 'unavailable', message: 'Route search failed', routes: [] },
        { type: 'split', label: 'Split Order', status: 'unavailable', message: 'Route search failed', routes: [] },
      ],
    };
  }
}
