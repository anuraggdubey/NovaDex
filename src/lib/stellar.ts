// Stellar SDK utilities for NovaDEX
// Transaction building, submission, and asset helpers

import * as StellarSdk from '@stellar/stellar-sdk';
import { Token, Route } from '@/types';

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
    ? StellarSdk.Networks.PUBLIC
    : StellarSdk.Networks.TESTNET;

export const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Gets a Stellar Asset object from a Token
 */
export function getStellarAsset(token: Token): StellarSdk.Asset {
  if (!token.issuer || token.id === 'xlm') {
    return StellarSdk.Asset.native();
  }
  return new StellarSdk.Asset(token.ticker, token.issuer);
}

/**
 * Loads account from Horizon
 */
export async function loadAccount(publicKey: string) {
  return horizonServer.loadAccount(publicKey);
}

/**
 * Fetches all token balances for a wallet from Horizon
 */
export async function fetchBalances(publicKey: string): Promise<Record<string, number>> {
  try {
    const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    if (!response.ok) return {};

    const data = await response.json();
    const balances: Record<string, number> = {};

    for (const balance of data.balances) {
      if (balance.asset_type === 'native') {
        balances['xlm'] = parseFloat(balance.balance);
      } else {
        const id = balance.asset_code.toLowerCase();
        balances[id] = parseFloat(balance.balance);
      }
    }

    return balances;
  } catch {
    return {};
  }
}

/**
 * Builds a PathPaymentStrictSend transaction XDR.
 * This is the core swap execution mechanism.
 */
export async function buildSwapTransaction(
  publicKey: string,
  route: Route,
  amountIn: string,
  slippageTolerance: string
): Promise<string> {
  const account = await horizonServer.loadAccount(publicKey);

  const expectedOutput = route.outputAmount;
  const slipPercent = parseFloat(slippageTolerance);
  const minOutput = expectedOutput * (1 - slipPercent / 100);

  let sendAsset = getStellarAsset(route.path[0]);
  let destAsset = getStellarAsset(route.path[route.path.length - 1]);

  const path: StellarSdk.Asset[] = [];

  if (route.id === 'mock-route') {
    // Testnet fallback: XLM -> XLM
    sendAsset = StellarSdk.Asset.native();
    destAsset = StellarSdk.Asset.native();
  } else {
    for (let i = 1; i < route.path.length - 1; i++) {
      path.push(getStellarAsset(route.path[i]));
    }
  }

  const operation = StellarSdk.Operation.pathPaymentStrictSend({
    sendAsset,
    sendAmount: parseFloat(amountIn).toFixed(7),
    destination: publicKey,
    destAsset,
    destMin: minOutput.toFixed(7),
    path,
  });

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  return transaction.toXDR();
}

/**
 * Submits a signed XDR transaction to Horizon
 */
export async function submitTransaction(signedXdr: string) {
  const transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  return horizonServer.submitTransaction(transaction);
}

/**
 * Verifies a Stellar keypair signature.
 * Used by /api/auth/verify for wallet ownership proof.
 */
export function verifySignature(
  publicKey: string,
  message: string,
  signature: string
): boolean {
  try {
    const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);
    const messageBytes = Buffer.from(message, 'utf8');
    const signatureBytes = Buffer.from(signature, 'base64');
    return keypair.verify(messageBytes, signatureBytes);
  } catch {
    return false;
  }
}

/**
 * Generates the auth challenge message for signature verification
 */
export function buildAuthChallenge(publicKey: string, timestamp: number): string {
  return `NovaDEX auth: ${timestamp} ${publicKey}`;
}
