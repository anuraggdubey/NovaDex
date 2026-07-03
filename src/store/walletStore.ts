'use client';
import { create } from 'zustand';
import { fetchBalances } from '@/lib/stellar';
import { clearWalletAuthCache } from '@/lib/walletSign';
import { useToastStore } from './toastStore';

interface WalletState {
  publicKey: string | null;
  provider: 'freighter' | 'albedo' | null;
  network: 'testnet' | 'mainnet' | null;
  xlmBalance: number;
  balances: Record<string, number>;
  isConnecting: boolean;
  connect: (provider: 'freighter' | 'albedo') => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  toggleNetwork: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  publicKey: null,
  provider: null,
  network: null,
  xlmBalance: 0,
  balances: {},
  isConnecting: false,

  connect: async (provider) => {
    set({ isConnecting: true });
    const { addToast } = useToastStore.getState();
    try {
      let pubKey = '';

      if (provider === 'freighter') {
        // Dynamic import to avoid SSR issues
        const { requestAccess, getNetwork, isConnected } = await import('@stellar/freighter-api');

        const connected = await isConnected();
        if (!connected.isConnected) {
          addToast('Freighter is not installed. Please install it from freighter.app', 'error');
          set({ isConnecting: false });
          return;
        }

        const access = await requestAccess();
        if (access.error) throw new Error(String(access.error));
        pubKey = access.address;

        // Network check
        const networkDetails = await getNetwork();
        const stellarNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
        if (networkDetails.network.toLowerCase() !== stellarNetwork.toUpperCase() &&
            networkDetails.network !== stellarNetwork) {
          addToast(
            `Please switch Freighter to ${stellarNetwork.toUpperCase()} to use NovaDEX`,
            'warning'
          );
        }
      } else if (provider === 'albedo') {
        const albedo = (await import('@albedo-link/intent')).default;
        const res = await albedo.publicKey({});
        pubKey = res.pubkey;
        if (!pubKey) throw new Error('Albedo connection failed');
      }

      if (!pubKey) throw new Error('No public key returned');

      // Fetch real balances from Horizon
      const balances = await fetchBalances(pubKey);
      const xlmBalance = balances['xlm'] || 0;

      set({
        publicKey: pubKey,
        provider,
        network: (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet') as 'testnet' | 'mainnet',
        xlmBalance,
        balances,
        isConnecting: false,
      });

      // Upsert user in Supabase via API route
      fetch('/api/users/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: pubKey }),
      }).catch(console.warn);

      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      addToast(`${providerName} wallet connected`, 'success');

      // Show no-XLM banner prompt if needed
      if (xlmBalance === 0) {
        addToast(
          'Your wallet has 0 XLM. You need at least 1 XLM for network fees.',
          'warning'
        );
      }
    } catch (error: any) {
      console.error('Wallet connect error:', error);
      useToastStore.getState().addToast(
        `Failed to connect: ${error.message || 'Unknown error'}`,
        'error'
      );
      set({ isConnecting: false });
    }
  },

  disconnect: () => {
    clearWalletAuthCache();
    set({
      publicKey: null,
      provider: null,
      network: null,
      xlmBalance: 0,
      balances: {},
    });
    useToastStore.getState().addToast('Wallet disconnected', 'info');
  },

  refreshBalances: async () => {
    const { publicKey } = get();
    if (!publicKey) return;
    const balances = await fetchBalances(publicKey);
    set({ balances, xlmBalance: balances['xlm'] || 0 });
  },

  toggleNetwork: () => {
    const current = get().network;
    if (!current) return;
    const next = current === 'testnet' ? 'mainnet' : 'testnet';
    set({ network: next });
    useToastStore.getState().addToast(`Switched to ${next.toUpperCase()}`, 'warning');
  },
}));
