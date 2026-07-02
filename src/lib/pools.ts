import { Token, Pool } from '@/types';
import { TOKENS } from '@/lib/routing';
import { computeSwapVolumeUsdc, STABLECOIN_CODES } from '@/lib/volume';
import { createServerClient } from '@/lib/supabase';

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
const XLM_USD_ESTIMATE = 0.12;

function reserveAssetString(token: Token): string {
  if (!token.issuer || token.id === 'xlm') return 'native';
  return `${token.ticker}:${token.issuer}`;
}

function parseHorizonAsset(asset: string): { ticker: string; issuer?: string; isNative: boolean } {
  if (asset === 'native') return { ticker: 'XLM', isNative: true };
  const [ticker, issuer] = asset.split(':');
  return { ticker, issuer, isNative: false };
}

function tokenFromHorizonAsset(asset: string): Token | null {
  const parsed = parseHorizonAsset(asset);
  const known = TOKENS.find(
    (t) =>
      (parsed.isNative && t.id === 'xlm') ||
      (t.ticker === parsed.ticker && t.issuer === parsed.issuer),
  );
  if (known) return known;
  if (!parsed.isNative && parsed.issuer) {
    return {
      id: parsed.ticker.toLowerCase(),
      ticker: parsed.ticker,
      name: parsed.ticker,
      decimals: 7,
      issuer: parsed.issuer,
    };
  }
  return null;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

function estimateUsdValue(amount: number, token: Token, xlmUsd = XLM_USD_ESTIMATE): number {
  if (STABLECOIN_CODES.has(token.ticker.toUpperCase())) return amount;
  if (token.id === 'xlm') return amount * xlmUsd;
  return amount * xlmUsd;
}

function mapHorizonPoolRecord(record: any): Pool | null {
  if (!record?.reserves || record.reserves.length !== 2) return null;

  const tokenA = tokenFromHorizonAsset(record.reserves[0].asset);
  const tokenB = tokenFromHorizonAsset(record.reserves[1].asset);
  if (!tokenA || !tokenB) return null;

  const amountA = parseFloat(record.reserves[0].amount);
  const amountB = parseFloat(record.reserves[1].amount);
  if (amountA <= 0 || amountB <= 0) return null;

  const usdA = estimateUsdValue(amountA, tokenA);
  const usdB = estimateUsdValue(amountB, tokenB);
  const tvl = usdA + usdB;

  return {
    id: record.id,
    tokenA,
    tokenB,
    tvl,
    volume24h: 0,
    feeRate: Number(record.fee_bp || 30) / 100,
    routingVolume: 0,
    source: 'amm',
    reserveAAmount: amountA,
    reserveBAmount: amountB,
    totalShares: record.total_shares,
    lastModified: record.last_modified_time,
  };
}

async function fetchHorizonPoolForPair(tokenA: Token, tokenB: Token): Promise<Pool | null> {
  const a = reserveAssetString(tokenA);
  const b = reserveAssetString(tokenB);
  const urls = [
    `${HORIZON_URL}/liquidity_pools?reserves=${a},${b}&limit=1`,
    `${HORIZON_URL}/liquidity_pools?reserves=${b},${a}&limit=1`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) continue;
      const record = (await response.json())._embedded?.records?.[0];
      const pool = mapHorizonPoolRecord(record);
      if (pool) return pool;
    } catch {
      /* try next */
    }
  }
  return null;
}

function buildOrderBookParams(selling: Token, buying: Token): URLSearchParams {
  const params = new URLSearchParams({ limit: '50' });
  if (!selling.issuer || selling.id === 'xlm') {
    params.set('selling_asset_type', 'native');
  } else {
    params.set('selling_asset_type', selling.ticker.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4');
    params.set('selling_asset_code', selling.ticker);
    params.set('selling_asset_issuer', selling.issuer);
  }
  if (!buying.issuer || buying.id === 'xlm') {
    params.set('buying_asset_type', 'native');
  } else {
    params.set('buying_asset_type', buying.ticker.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4');
    params.set('buying_asset_code', buying.ticker);
    params.set('buying_asset_issuer', buying.issuer);
  }
  return params;
}

async function fetchSdexLiquidityPool(tokenA: Token, tokenB: Token): Promise<Pool | null> {
  try {
    const params = buildOrderBookParams(tokenA, tokenB);
    const response = await fetch(`${HORIZON_URL}/order_book?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const data = await response.json();
    const bids: any[] = data.bids || [];
    const asks: any[] = data.asks || [];
    if (!bids.length && !asks.length) return null;

    const baseToken = data.base?.asset_type === 'native'
      ? TOKENS.find((t) => t.id === 'xlm')!
      : TOKENS.find((t) => t.ticker === data.base?.asset_code && t.issuer === data.base?.asset_issuer)
        || { id: data.base.asset_code.toLowerCase(), ticker: data.base.asset_code, name: data.base.asset_code, decimals: 7, issuer: data.base.asset_issuer };

    const counterToken = data.counter?.asset_type === 'native'
      ? TOKENS.find((t) => t.id === 'xlm')!
      : TOKENS.find((t) => t.ticker === data.counter?.asset_code && t.issuer === data.counter?.asset_issuer)
        || { id: data.counter.asset_code.toLowerCase(), ticker: data.counter.asset_code, name: data.counter.asset_code, decimals: 7, issuer: data.counter.asset_issuer };

    let depthUsd = 0;
    for (const ask of asks) {
      const baseAmt = parseFloat(ask.amount);
      const price = parseFloat(ask.price);
      depthUsd += estimateUsdValue(baseAmt, baseToken as Token, price);
    }
    for (const bid of bids) {
      const counterAmt = parseFloat(bid.amount);
      depthUsd += estimateUsdValue(counterAmt, counterToken as Token);
    }

    if (depthUsd <= 0) return null;

    return {
      id: `sdex-${tokenA.ticker}-${tokenB.ticker}`,
      tokenA,
      tokenB,
      tvl: depthUsd,
      volume24h: 0,
      feeRate: 0.15,
      routingVolume: 0,
      source: 'sdex',
      lastModified: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchHorizonPoolsScan(): Promise<Pool[]> {
  const pools: Pool[] = [];
  const knownIssuers = new Set(TOKENS.filter((t) => t.issuer).map((t) => t.issuer!));

  try {
    const response = await fetch(`${HORIZON_URL}/liquidity_pools?limit=100&order=desc`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return pools;

    const records: any[] = (await response.json())._embedded?.records || [];
    for (const record of records) {
      const assets = (record.reserves || []).map((r: any) => r.asset);
      const hasNative = assets.includes('native');
      const hasKnownIssuer = assets.some((a: string) => {
        const parsed = parseHorizonAsset(a);
        return parsed.issuer && knownIssuers.has(parsed.issuer);
      });
      if (!hasNative && !hasKnownIssuer) continue;

      const pool = mapHorizonPoolRecord(record);
      if (pool) pools.push(pool);
    }
  } catch {
    /* ignore */
  }
  return pools;
}

function getSupportedPairs(): [Token, Token][] {
  const xlm = TOKENS.find((t) => t.id === 'xlm');
  if (!xlm) return [];

  const pairs: [Token, Token][] = [];
  const others = TOKENS.filter((t) => t.id !== 'xlm');

  for (const token of others) {
    pairs.push([xlm, token]);
  }

  const usdc = TOKENS.find((t) => t.ticker === 'USDC');
  if (usdc) {
    for (const token of others.filter((t) => t.ticker !== 'USDC')) {
      pairs.push([usdc, token]);
    }
  }

  return pairs;
}

async function enrichWithSwapStats(pools: Pool[]): Promise<Pool[]> {
  try {
    const supabase = createServerClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: swaps } = await supabase
      .from('swaps')
      .select('asset_in_code, asset_out_code, amount_in, amount_out, executed_at, status')
      .eq('status', 'completed');

    if (!swaps?.length) return pools;

    const volume24hMap = new Map<string, number>();
    const routingMap = new Map<string, number>();

    for (const swap of swaps) {
      const key = pairKey(swap.asset_in_code, swap.asset_out_code);
      const vol = computeSwapVolumeUsdc(swap);
      routingMap.set(key, (routingMap.get(key) || 0) + vol);

      if (new Date(swap.executed_at) >= new Date(since)) {
        volume24hMap.set(key, (volume24hMap.get(key) || 0) + vol);
      }
    }

    return pools.map((pool) => {
      const key = pairKey(pool.tokenA.ticker, pool.tokenB.ticker);
      return {
        ...pool,
        volume24h: volume24hMap.get(key) || 0,
        routingVolume: routingMap.get(key) || 0,
      };
    });
  } catch {
    return pools;
  }
}

export async function fetchLiquidityPools(): Promise<Pool[]> {
  const seen = new Set<string>();
  const pools: Pool[] = [];

  const addPool = (pool: Pool | null) => {
    if (!pool) return;
    const key = `${pairKey(pool.tokenA.ticker, pool.tokenB.ticker)}:${pool.source}`;
    if (seen.has(key)) return;
    seen.add(key);
    pools.push(pool);
  };

  for (const [tokenA, tokenB] of getSupportedPairs()) {
    const ammPool = await fetchHorizonPoolForPair(tokenA, tokenB);
    addPool(ammPool);

    if (!ammPool) {
      addPool(await fetchSdexLiquidityPool(tokenA, tokenB));
    }
  }

  if (STELLAR_NETWORK === 'testnet') {
    for (const pool of await fetchHorizonPoolsScan()) {
      addPool(pool);
    }
  }

  const enriched = await enrichWithSwapStats(pools);
  return enriched
    .sort((a, b) => {
      const aNova = isNovaDexPair(a);
      const bNova = isNovaDexPair(b);
      if (aNova !== bNova) return aNova ? -1 : 1;
      return b.tvl - a.tvl;
    })
    .slice(0, 30);
}

function isNovaDexPair(pool: Pool): boolean {
  const tickers = new Set(TOKENS.map((t) => t.ticker));
  return tickers.has(pool.tokenA.ticker) && tickers.has(pool.tokenB.ticker);
}
