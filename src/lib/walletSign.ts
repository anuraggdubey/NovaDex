'use client';

import * as StellarSdk from '@stellar/stellar-sdk';
import { buildAuthChallenge } from '@/lib/stellar';
import { getAlbedoNetwork, getNetworkPassphrase } from '@/lib/network';

export type WalletProvider = 'freighter' | 'albedo';

export { getNetworkPassphrase, getAlbedoNetwork };

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
    network: getAlbedoNetwork(),
    submit: false,
    description: 'NovaDEX swap',
  });
  if (!res.signed_envelope_xdr) throw new Error('Albedo did not return a signed transaction');
  return res.signed_envelope_xdr;
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

export async function buildAuthenticatedHeaders(
  publicKey: string,
  provider: WalletProvider | null,
): Promise<HeadersInit> {
  if (!provider) return { 'Content-Type': 'application/json' };

  const timestamp = Date.now();
  const proof = await signWalletAuthMessage(publicKey, provider, timestamp);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-nd-pubkey': publicKey,
    'x-nd-timestamp': String(timestamp),
    'x-nd-signature': proof.signature,
  };
  if (proof.signedPayload) {
    headers['x-nd-signed-payload'] = proof.signedPayload;
  }
  return headers;
}
