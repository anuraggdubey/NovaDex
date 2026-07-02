// Stellar SDK utilities for NovaDEX
// Transaction building, submission, and asset helpers

import * as StellarSdk from '@stellar/stellar-sdk';
import { Token, Route } from '@/types';
import { getNetworkPassphrase } from '@/lib/network';
import {
  buildAttestSwapOperation,
  buildRecordSavingsOperation,
  oracleSupports,
  prepareSwapTransaction,
  routerSupports,
  simulateRouterQuote,
  submitSorobanTransaction,
  transactionHasSorobanOps,
} from '@/lib/soroban';

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = getNetworkPassphrase();

export const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

export interface BuildSwapOptions {
  allRoutes?: Route[];
  savingsUsdc?: number;
  savingsContext?: { sdexBest?: number; aquaBest?: number };
}

function decodeSignatureBuffer(signature: string): Buffer {
  const trimmed = signature.trim();
  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  return Buffer.from(trimmed, 'base64');
}

export function getStellarAsset(token: Token): StellarSdk.Asset {
  if (!token.issuer || token.id === 'xlm') {
    return StellarSdk.Asset.native();
  }
  return new StellarSdk.Asset(token.ticker, token.issuer);
}

export async function loadAccount(publicKey: string) {
  return horizonServer.loadAccount(publicKey);
}

export async function fetchBalances(publicKey: string): Promise<Record<string, number>> {
  try {
    const { TOKENS } = await import('@/lib/routing');
    const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    if (!response.ok) return {};

    const data = await response.json();
    const balances: Record<string, number> = {};

    for (const balance of data.balances) {
      if (balance.asset_type === 'native') {
        balances['xlm'] = parseFloat(balance.balance);
      } else {
        const matched = TOKENS.find(
          (t: Token) => t.ticker === balance.asset_code && t.issuer === balance.asset_issuer,
        );
        if (matched) {
          balances[matched.id] = parseFloat(balance.balance);
        } else {
          const id = balance.asset_code.toLowerCase();
          balances[id] = parseFloat(balance.balance);
        }
      }
    }

    return balances;
  } catch {
    return {};
  }
}

function addPathPaymentOperation(
  builder: StellarSdk.TransactionBuilder,
  route: Route,
  amountIn: string,
  slippageTolerance: string,
  destination: string,
) {
  const expectedOutput = route.outputAmount;
  const slipPercent = parseFloat(slippageTolerance);
  const minOutput = expectedOutput * (1 - slipPercent / 100);

  let sendAsset = getStellarAsset(route.path[0]);
  let destAsset = getStellarAsset(route.path[route.path.length - 1]);
  const path: StellarSdk.Asset[] = [];

  if (route.id === 'mock-route') {
    sendAsset = StellarSdk.Asset.native();
    destAsset = StellarSdk.Asset.native();
  } else {
    for (let i = 1; i < route.path.length - 1; i++) {
      path.push(getStellarAsset(route.path[i]));
    }
  }

  builder.addOperation(
    StellarSdk.Operation.pathPaymentStrictSend({
      sendAsset,
      sendAmount: parseFloat(amountIn).toFixed(7),
      destination,
      destAsset,
      destMin: minOutput.toFixed(7),
      path,
    }),
  );
}

function pickLegRoute(allRoutes: Route[] | undefined, sourceType: Route['sourceType']): Route | null {
  if (!allRoutes?.length) return null;
  const matches = allRoutes.filter((r) => r.sourceType === sourceType && r.outputAmount > 0 && r.id !== 'route-empty');
  if (!matches.length) return null;
  return matches.sort((a, b) => b.outputAmount - a.outputAmount)[0];
}

export async function buildSwapTransaction(
  publicKey: string,
  route: Route,
  amountIn: string,
  slippageTolerance: string,
  options: BuildSwapOptions = {},
): Promise<string> {
  const onChainQuote = await simulateRouterQuote(publicKey, route, amountIn);
  if (onChainQuote !== null) {
    const slipPercent = parseFloat(slippageTolerance);
    const minOutput = route.outputAmount * (1 - slipPercent / 100);
    const quotedHuman = Number(onChainQuote) / 10_000_000;
    if (quotedHuman < minOutput * 0.95) {
      throw new Error('Soroban router quote is below your slippage tolerance');
    }
  }

  const account = await horizonServer.loadAccount(publicKey);
  const slipPercent = parseFloat(slippageTolerance);
  const minOutput = route.outputAmount * (1 - slipPercent / 100);

  const builder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (route.isSplit) {
    const aquaRoute = pickLegRoute(options.allRoutes, 'aquarius') ?? route;
    const sdexRoute = pickLegRoute(options.allRoutes, 'sdex') ?? route;
    const total = parseFloat(amountIn);
    const aquaAmount = (total * 0.65).toFixed(7);
    const sdexAmount = (total * 0.35).toFixed(7);
    addPathPaymentOperation(builder, aquaRoute, aquaAmount, slippageTolerance, publicKey);
    addPathPaymentOperation(builder, sdexRoute, sdexAmount, slippageTolerance, publicKey);
  } else {
    addPathPaymentOperation(builder, route, amountIn, slippageTolerance, publicKey);
  }

  const [hasAttest, hasRecordSavings] = await Promise.all([
    routerSupports('attest_swap'),
    oracleSupports('record_savings_user'),
  ]);

  if (hasAttest) {
    builder.addOperation(
      buildAttestSwapOperation(publicKey, route, amountIn, minOutput, route.outputAmount),
    );
  }

  if (hasRecordSavings && (options.savingsUsdc ?? 0) > 0) {
    const from = route.path[0];
    const to = route.path[route.path.length - 1];
    const pairLabel = `${from.ticker}/${to.ticker}`;
    const bestDirect =
      options.savingsContext?.sdexBest ??
      options.savingsContext?.aquaBest ??
      Math.max(0, route.outputAmount - (options.savingsUsdc ?? 0));

    builder.addOperation(
      buildRecordSavingsOperation(
        publicKey,
        pairLabel,
        options.savingsUsdc ?? 0,
        bestDirect,
        route.outputAmount,
        route.fingerprint,
      ),
    );
  }

  let transaction = builder.setTimeout(180).build();

  if (transactionHasSorobanOps(transaction)) {
    transaction = await prepareSwapTransaction(transaction);
  }

  return transaction.toXDR();
}

export async function buildTrustlineTransaction(publicKey: string): Promise<string> {
  const { TOKENS } = await import('@/lib/routing');
  const account = await horizonServer.loadAccount(publicKey);

  const builder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  for (const token of TOKENS) {
    if (token.id !== 'xlm' && token.issuer) {
      builder.addOperation(
        StellarSdk.Operation.changeTrust({
          asset: new StellarSdk.Asset(token.ticker, token.issuer),
          limit: '1000000',
        }),
      );
    }
  }

  return builder.setTimeout(60).build().toXDR();
}

export async function submitTransaction(signedXdr: string) {
  const transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  if (transaction instanceof StellarSdk.Transaction && transactionHasSorobanOps(transaction)) {
    return submitSorobanTransaction(signedXdr);
  }

  if (!(transaction instanceof StellarSdk.Transaction)) {
    throw new Error('Fee bump transactions are not supported');
  }

  return horizonServer.submitTransaction(transaction);
}

export function verifySignature(publicKey: string, message: string, signature: string): boolean {
  try {
    const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);
    const messageBytes = Buffer.from(message, 'utf8');
    const signatureBytes = decodeSignatureBuffer(signature);
    return keypair.verify(messageBytes, signatureBytes);
  } catch {
    return false;
  }
}

export function buildAuthChallenge(publicKey: string, timestamp: number): string {
  return `NovaDEX auth: ${timestamp} ${publicKey}`;
}
