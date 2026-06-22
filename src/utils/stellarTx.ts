import * as StellarSdk from '@stellar/stellar-sdk';
import { Token, Route } from '../types';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Builds a Stellar PathPaymentStrictSend transaction.
 * @param publicKey The user's public key
 * @param selectedRoute The route containing hops and expected output
 * @param amountIn The exact amount of the source token to spend
 * @param slippageTolerance Percentage of slippage tolerance (e.g. "0.5")
 * @returns Base64 encoded XDR string
 */
export async function buildSwapTransaction(
  publicKey: string,
  selectedRoute: Route,
  amountIn: string,
  slippageTolerance: string
): Promise<string> {
  const account = await server.loadAccount(publicKey);
  
  // Calculate destMin (minimum output acceptable)
  const expectedOutput = selectedRoute.outputAmount;
  const slipPercent = parseFloat(slippageTolerance);
  const minOutput = expectedOutput * (1 - (slipPercent / 100));
  
  let sendAsset = getStellarAsset(selectedRoute.path[0]);
  let destAsset = getStellarAsset(selectedRoute.path[selectedRoute.path.length - 1]);
  
  // Create path from route hops
  const path: StellarSdk.Asset[] = [];
  
  if (selectedRoute.id === 'mock-route') {
    // To ensure the transaction succeeds on Testnet despite having no real liquidity pools
    // for the mock tokens, we force the assets to native XLM -> XLM. 
    // This allows the PathPaymentStrictSend to succeed directly on the ledger.
    sendAsset = StellarSdk.Asset.native();
    destAsset = StellarSdk.Asset.native();
  } else {
    for (let i = 1; i < selectedRoute.path.length - 1; i++) {
      path.push(getStellarAsset(selectedRoute.path[i]));
    }
  }

  // Construct operation
  const operation = StellarSdk.Operation.pathPaymentStrictSend({
    sendAsset: sendAsset,
    sendAmount: amountIn.toString(),
    destination: publicKey,
    destAsset: destAsset,
    destMin: minOutput.toFixed(7), // Stellar uses 7 decimal places
    path: path,
  });

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  return transaction.toXDR();
}

/**
 * Submits a signed XDR to the Stellar network
 * @param signedXdr Base64 encoded signed transaction
 * @returns The transaction result including the hash
 */
export async function submitTransaction(signedXdr: string) {
  const transaction = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    StellarSdk.Networks.TESTNET
  );
  return await server.submitTransaction(transaction);
}

function getStellarAsset(token: Token): StellarSdk.Asset {
  if (token.id === 'xlm' || !token.issuer) {
    return StellarSdk.Asset.native();
  }
  return new StellarSdk.Asset(token.ticker, token.issuer);
}
