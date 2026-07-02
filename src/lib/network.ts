import * as StellarSdk from '@stellar/stellar-sdk';

export function getNetworkPassphrase(): string {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
    ? StellarSdk.Networks.PUBLIC
    : StellarSdk.Networks.TESTNET;
}

export function getAlbedoNetwork(): 'public' | 'testnet' {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'public' : 'testnet';
}

export function getHorizonUrl(): string {
  return process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';
}

export function getSorobanRpcUrl(): string {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
    ? 'https://soroban.stellar.org'
    : 'https://soroban-testnet.stellar.org';
}
