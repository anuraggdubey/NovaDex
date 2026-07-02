export const STABLECOIN_CODES = new Set(['USDC', 'USDT', 'DAI', 'BUSD']);

export interface SwapVolumeInput {
  asset_in_code: string;
  asset_out_code: string;
  amount_in: number | string;
  amount_out: number | string;
}

/** USD notional for a swap — uses the stablecoin leg when present. */
export function computeSwapVolumeUsdc(swap: SwapVolumeInput): number {
  const inCode = (swap.asset_in_code || '').toUpperCase();
  const outCode = (swap.asset_out_code || '').toUpperCase();
  const amountIn = Number(swap.amount_in || 0);
  const amountOut = Number(swap.amount_out || 0);

  if (STABLECOIN_CODES.has(inCode)) return amountIn;
  if (STABLECOIN_CODES.has(outCode)) return amountOut;

  // No stablecoin leg — fall back to input amount (caller should label with asset code).
  return amountIn;
}

export function hasStablecoinLeg(swap: SwapVolumeInput): boolean {
  const inCode = (swap.asset_in_code || '').toUpperCase();
  const outCode = (swap.asset_out_code || '').toUpperCase();
  return STABLECOIN_CODES.has(inCode) || STABLECOIN_CODES.has(outCode);
}

export function sumSwapVolumeUsdc(swaps: SwapVolumeInput[]): number {
  return swaps.reduce((acc, swap) => acc + computeSwapVolumeUsdc(swap), 0);
}

export function formatUsd(value: number): string {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Format cumulative volume — USD when swaps have a stablecoin leg, otherwise native units. */
export function formatTotalVolume(swaps: SwapVolumeInput[]): string {
  if (swaps.length === 0) return '$0.00';

  const allHaveStablecoin = swaps.every(hasStablecoinLeg);
  if (allHaveStablecoin) {
    return formatUsd(sumSwapVolumeUsdc(swaps));
  }

  const byAsset: Record<string, number> = {};
  for (const swap of swaps) {
    const code = swap.asset_in_code || 'UNKNOWN';
    byAsset[code] = (byAsset[code] || 0) + Number(swap.amount_in || 0);
  }

  return Object.entries(byAsset)
    .map(([code, amount]) =>
      `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`
    )
    .join(' + ');
}

export function formatPairVolume(swap: SwapVolumeInput): string {
  if (hasStablecoinLeg(swap)) {
    return formatUsd(computeSwapVolumeUsdc(swap));
  }
  return `${Number(swap.amount_in || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${swap.asset_in_code}`;
}
