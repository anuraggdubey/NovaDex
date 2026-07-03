'use client';

import { buildAuthChallenge, formatHorizonSubmitError, submitRawTransaction, submitTransaction } from '@/lib/stellar';
import { getNetworkPassphrase } from '@/lib/network';

export type WalletProvider = 'freighter' | 'albedo';

export { getNetworkPassphrase };

export type WalletSubmitResult = { successful: true; hash: string };

interface AlbedoHorizonResult {
  successful?: boolean;
  hash?: string;
  detail?: string;
  title?: string;
  extras?: { result_codes?: { transaction?: string; operations?: string[] } };
}

function throwHorizonLikeError(data: Record<string, unknown>): never {
  const error = new Error(formatHorizonSubmitError(data)) as Error & {
    response?: { data: Record<string, unknown> };
  };
  error.response = { data };
  throw error;
}

export async function signWalletTransaction(
  xdr: string,
  provider: WalletProvider,
  publicKey: string,
): Promise<string> {
  const networkPassphrase = getNetworkPassphrase();

  if (provider === 'freighter') {
    const { signTransaction } = await import('@stellar/freighter-api');
    const res = await signTransaction(xdr, { networkPassphrase, address: publicKey });
    if (res.error) {
      throw new Error(typeof res.error === 'string' ? res.error : JSON.stringify(res.error));
    }
    if (!res.signedTxXdr) throw new Error('Freighter did not return a signed transaction');
    return res.signedTxXdr;
  }

  const albedo = (await import('@albedo-link/intent')).default;
  const res = await albedo.tx({
    xdr,
    pubkey: publicKey,
    network: networkPassphrase,
    submit: false,
    description: 'NovaDEX transaction',
  });
  if (!res.signed_envelope_xdr) throw new Error('Albedo did not return a signed transaction');
  return res.signed_envelope_xdr;
}

/**
 * Sign and submit a classic Stellar transaction.
 * Albedo: signs + submits via intent (submit:true) to avoid bad_auth from envelope re-encoding.
 * Freighter: sign locally, submit via Horizon SDK.
 */
export async function signAndSubmitWalletTransaction(
  xdr: string,
  provider: WalletProvider,
  publicKey: string,
  description = 'NovaDEX transaction',
): Promise<WalletSubmitResult> {
  const networkPassphrase = getNetworkPassphrase();

  if (provider === 'freighter') {
    const signedXdr = await signWalletTransaction(xdr, provider, publicKey);
    return submitTransaction(signedXdr);
  }

  const albedo = (await import('@albedo-link/intent')).default;
  const res = await albedo.tx({
    xdr,
    pubkey: publicKey,
    network: networkPassphrase,
    submit: true,
    description,
  });

  const horizonResult = res.result as AlbedoHorizonResult | undefined;
  if (horizonResult?.successful === true) {
    return {
      successful: true,
      hash: horizonResult.hash || res.tx_hash,
    };
  }

  if (horizonResult && horizonResult.successful === false) {
    throwHorizonLikeError(horizonResult as Record<string, unknown>);
  }

  if (res.signed_envelope_xdr) {
    return submitRawTransaction(res.signed_envelope_xdr);
  }

  if (res.tx_hash) {
    return { successful: true, hash: res.tx_hash };
  }

  throw new Error('Albedo did not return a signed transaction or submission result');
}

export interface WalletAuthProof {
  signature: string;
  signedPayload?: string;
}

export async function signWalletAuthMessage(
  publicKey: string,
  provider: WalletProvider,
  timestamp: number,
): Promise<WalletAuthProof> {
  const message = buildAuthChallenge(publicKey, timestamp);

  if (provider === 'freighter') {
    const { signMessage } = await import('@stellar/freighter-api');
    const res = await signMessage(message, { address: publicKey });
    if (res.error) {
      throw new Error(typeof res.error === 'string' ? res.error : JSON.stringify(res.error));
    }
    if (!res.signedMessage) throw new Error('Freighter did not return a signature');
    return { signature: String(res.signedMessage) };
  }

  const albedo = (await import('@albedo-link/intent')).default;
  const res = await albedo.signMessage({ message, pubkey: publicKey });
  return {
    signature: res.message_signature,
    signedPayload: res.signed_message,
  };
}

const AUTH_TTL_MS = 4 * 60 * 1000;

type AuthHeaders = Record<string, string>;

interface AuthCacheEntry {
  headers: AuthHeaders;
  expiresAt: number;
}

const authCache = new Map<string, AuthCacheEntry>();
const inflightAuth = new Map<string, Promise<AuthHeaders>>();

function authCacheKey(publicKey: string, provider: WalletProvider) {
  return `${publicKey}:${provider}`;
}

export function clearWalletAuthCache(publicKey?: string, provider?: WalletProvider | null) {
  if (publicKey && provider) {
    const key = authCacheKey(publicKey, provider);
    authCache.delete(key);
    inflightAuth.delete(key);
    return;
  }
  authCache.clear();
  inflightAuth.clear();
}

export async function buildAuthenticatedHeaders(
  publicKey: string,
  provider: WalletProvider | null,
  options?: { forceRefresh?: boolean },
): Promise<HeadersInit> {
  if (!provider) return { 'Content-Type': 'application/json' };

  const key = authCacheKey(publicKey, provider);

  if (!options?.forceRefresh) {
    const cached = authCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.headers;
    }
    const pending = inflightAuth.get(key);
    if (pending) {
      return pending;
    }
  } else {
    authCache.delete(key);
  }

  const signPromise = (async (): Promise<AuthHeaders> => {
    const timestamp = Date.now();
    const proof = await signWalletAuthMessage(publicKey, provider, timestamp);
    const headers: AuthHeaders = {
      'Content-Type': 'application/json',
      'x-nd-pubkey': publicKey,
      'x-nd-timestamp': String(timestamp),
      'x-nd-signature': proof.signature,
    };
    if (proof.signedPayload) {
      headers['x-nd-signed-payload'] = proof.signedPayload;
    }
    authCache.set(key, {
      headers,
      expiresAt: timestamp + AUTH_TTL_MS,
    });
    return headers;
  })();

  inflightAuth.set(key, signPromise);
  try {
    return await signPromise;
  } finally {
    inflightAuth.delete(key);
  }
}
