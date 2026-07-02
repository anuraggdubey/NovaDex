import * as StellarSdk from '@stellar/stellar-sdk';
import { Route, RouteSourceType, Token } from '@/types';
import { getNetworkPassphrase, getSorobanRpcUrl } from '@/lib/network';

const { Address, Operation, nativeToScVal, rpc, contract } = StellarSdk;

const RPC_URL = getSorobanRpcUrl();

const AGGREGATOR_ID = process.env.NEXT_PUBLIC_AGGREGATOR_CONTRACT_ID || '';
const ORACLE_ID = process.env.NEXT_PUBLIC_ORACLE_CONTRACT_ID || '';

export const sorobanRpc = new rpc.Server(RPC_URL);

type SorobanClient = Record<string, (...args: unknown[]) => Promise<{ simulate: () => Promise<void>; result?: unknown; simulation?: { result?: { retval?: unknown } } }>>;

function isConfiguredContractId(id: string): boolean {
  return Boolean(id && !id.startsWith('set_') && !id.startsWith('placeholder') && id.startsWith('C'));
}

export function toStroops(amount: number | string): bigint {
  return BigInt(Math.round(parseFloat(String(amount)) * 10_000_000));
}

export function pairIdBytes(pair: string): Buffer {
  const buf = Buffer.alloc(32);
  const src = Buffer.from(pair, 'utf8');
  src.copy(buf, 0, 0, Math.min(32, src.length));
  return buf;
}

function sourceTypeToCode(source?: RouteSourceType): number {
  if (source === 'aquarius') return 1;
  if (source === 'split') return 2;
  return 0;
}

function tokenToAddress(token: Token, fallback: string): StellarSdk.Address {
  if (token.id === 'xlm' || !token.issuer) {
    return Address.fromString(fallback);
  }
  return Address.fromString(token.issuer);
}

function buildRouteHop(from: Token, to: Token, fallback: string, source: number) {
  return {
    asset_in: tokenToAddress(from, fallback),
    asset_out: tokenToAddress(to, fallback),
    source,
    pool_id: Buffer.alloc(32),
  };
}

async function getRouterClient(): Promise<SorobanClient | null> {
  if (!isConfiguredContractId(AGGREGATOR_ID)) return null;
  const client = await contract.Client.from({
    contractId: AGGREGATOR_ID,
    rpcUrl: RPC_URL,
    networkPassphrase: getNetworkPassphrase(),
  });
  return client as unknown as SorobanClient;
}

async function getOracleClient(): Promise<SorobanClient | null> {
  if (!isConfiguredContractId(ORACLE_ID)) return null;
  const client = await contract.Client.from({
    contractId: ORACLE_ID,
    rpcUrl: RPC_URL,
    networkPassphrase: getNetworkPassphrase(),
  });
  return client as unknown as SorobanClient;
}

export async function routerSupports(method: string): Promise<boolean> {
  const client = await getRouterClient();
  return Boolean(client && typeof client[method] === 'function');
}

export async function oracleSupports(method: string): Promise<boolean> {
  const client = await getOracleClient();
  return Boolean(client && typeof client[method] === 'function');
}

export async function simulateRouterQuote(
  publicKey: string,
  route: Route,
  amountIn: string,
): Promise<bigint | null> {
  const client = await getRouterClient();
  if (!client?.get_quote) return null;

  const from = route.path[0];
  const to = route.path[route.path.length - 1];

  try {
    const hop = buildRouteHop(from, to, publicKey, sourceTypeToCode(route.sourceType));
    const assembled = await client.get_quote({
      route: { hops: [hop] },
      amount_in: toStroops(amountIn),
    });
    await assembled.simulate();
    const value = assembled.result;
    if (typeof value === 'bigint') return value;
    if (value && typeof value === 'object' && 'value' in (value as object)) {
      return (value as { value: bigint }).value;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildAttestSwapOperation(
  publicKey: string,
  route: Route,
  amountIn: string,
  minOut: number,
  quotedOut: number,
) {
  const deadline = Math.floor(Date.now() / 1000) + 300;
  return Operation.invokeContractFunction({
    contract: AGGREGATOR_ID,
    function: 'attest_swap',
    args: [
      Address.fromString(publicKey).toScVal(),
      nativeToScVal(toStroops(amountIn), { type: 'i128' }),
      nativeToScVal(toStroops(minOut), { type: 'i128' }),
      nativeToScVal(toStroops(quotedOut), { type: 'i128' }),
      nativeToScVal(BigInt(deadline), { type: 'u64' }),
      nativeToScVal(route.hops || 1, { type: 'u32' }),
      nativeToScVal(sourceTypeToCode(route.sourceType), { type: 'u32' }),
    ],
  });
}

export function buildRecordSavingsOperation(
  publicKey: string,
  pairLabel: string,
  savingsUsdc: number,
  bestDirect: number,
  actualOut: number,
  fingerprint: string,
) {
  const savingsScaled = BigInt(Math.max(1, Math.round(savingsUsdc * 1_000_000)));
  const bestScaled = BigInt(Math.max(1, Math.round(bestDirect * 10_000_000)));
  const actualScaled = BigInt(Math.max(1, Math.round(actualOut * 10_000_000)));

  return Operation.invokeContractFunction({
    contract: ORACLE_ID,
    function: 'record_savings_user',
    args: [
      Address.fromString(publicKey).toScVal(),
      nativeToScVal(pairIdBytes(pairLabel), { type: 'bytes' }),
      nativeToScVal(savingsScaled, { type: 'i128' }),
      nativeToScVal(bestScaled, { type: 'i128' }),
      nativeToScVal(actualScaled, { type: 'i128' }),
      nativeToScVal(pairIdBytes(fingerprint), { type: 'bytes' }),
    ],
  });
}

export async function prepareSwapTransaction(transaction: StellarSdk.Transaction) {
  const prepared = await sorobanRpc.prepareTransaction(transaction);
  if (prepared instanceof StellarSdk.Transaction) {
    return prepared;
  }
  throw new Error('Failed to prepare Soroban transaction');
}

export async function submitSorobanTransaction(signedXdr: string) {
  const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase());
  if (!(tx instanceof StellarSdk.Transaction)) {
    throw new Error('Fee bump transactions are not supported for swaps');
  }

  const response = await sorobanRpc.sendTransaction(tx);

  if (response.status === 'ERROR') {
    throw new Error(response.errorResult?.toString() || 'Soroban transaction failed');
  }

  let getResponse = await sorobanRpc.getTransaction(response.hash);
  while (getResponse.status === 'NOT_FOUND') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResponse = await sorobanRpc.getTransaction(response.hash);
  }

  if (getResponse.status !== 'SUCCESS') {
    throw new Error('Transaction was not successful on Soroban RPC');
  }

  return {
    successful: true,
    hash: response.hash,
  };
}

export function transactionHasSorobanOps(transaction: StellarSdk.Transaction): boolean {
  return transaction.operations.some((op) => op.type === 'invokeHostFunction');
}
