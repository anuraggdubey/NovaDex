/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { Token, Route } from './types';
import { TOKENS, fetchRoutes } from './data';
import { requestAccess, getNetwork } from '@stellar/freighter-api';
import albedo from '@albedo-link/intent';

// --- Toast Store ---
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

// --- Wallet Store ---
interface WalletState {
  publicKey: string | null;
  provider: 'freighter' | 'albedo' | null;
  network: 'testnet' | 'mainnet' | null;
  xlmBalance: number;
  balances: { [tokenId: string]: number };
  connect: (provider: 'freighter' | 'albedo') => Promise<void>;
  disconnect: () => void;
  toggleNetwork: () => void;
  refreshBalances: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  publicKey: null,
  provider: null,
  network: null,
  xlmBalance: 0,
  balances: {},
  connect: async (provider) => {
    try {
      let pubKey = '';
      if (provider === 'freighter') {
        const access = await requestAccess();
        if (access.error) throw new Error(access.error);
        pubKey = access.address;
        if (!pubKey) throw new Error('Freighter connection failed or was denied');
        
        const networkDetails = await getNetwork();
        if (networkDetails.network !== 'TESTNET') {
           useToastStore.getState().addToast(`Please open Freighter extension and switch network to TESTNET!`, 'warning');
        }
      } else if (provider === 'albedo') {
        const res = await albedo.publicKey({});
        pubKey = res.pubkey;
        if (!pubKey) throw new Error('Albedo connection failed');
      }

      // Fetch real balances from Stellar Horizon
      const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';
      let xlmBalance = 0;
      const balances: Record<string, number> = {};
      try {
        const response = await fetch(`${HORIZON_URL}/accounts/${pubKey}`);
        if (response.ok) {
          const data = await response.json();
          for (const b of data.balances) {
            if (b.asset_type === 'native') {
              xlmBalance = parseFloat(b.balance);
              balances['xlm'] = xlmBalance;
            } else {
              const id = b.asset_code.toLowerCase();
              balances[id] = parseFloat(b.balance);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch balance from Horizon', err);
      }

      set({
        publicKey: pubKey,
        provider,
        network: 'testnet',
        xlmBalance,
        balances,
      });
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      useToastStore.getState().addToast(`${providerName} wallet connected successfully`, 'success');
    } catch (error: any) {
      console.error(error);
      useToastStore.getState().addToast(`Failed to connect wallet: ${error.message}`, 'error');
    }
  },
  disconnect: () => {
    set({
      publicKey: null,
      provider: null,
      network: null,
      xlmBalance: 0,
      balances: {},
    });
    useToastStore.getState().addToast('Wallet disconnected', 'info');
  },
  toggleNetwork: () => {
    const current = get().network;
    if (!current) return;
    const nextNetwork = current === 'testnet' ? 'mainnet' : 'testnet';
    set({ network: nextNetwork });
    useToastStore.getState().addToast(`Switched network session to ${nextNetwork.toUpperCase()}`, 'warning');
  },
  refreshBalances: () => {
    if (!get().publicKey) return;
    set((state) => ({
      xlmBalance: state.xlmBalance + 2.50,
      balances: {
        ...state.balances,
        xlm: state.balances.xlm + 2.50,
      },
    }));
  },
}));

// --- Swap Store ---
interface SwapState {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  slippageTolerance: string; // '0.1' | '0.5' | '1' | 'custom'
  customSlippageValue: string; // e.g., '1.5'
  selectedRoute: Route | null;
  alternativeRoutes: Route[];
  isLoadingRoute: boolean;
  setFromToken: (token: Token) => void;
  setToToken: (token: Token) => void;
  setFromAmount: (amount: string) => void;
  setSlippageTolerance: (tolerance: string, customVal?: string) => void;
  swapDirection: () => void;
  selectRoute: (route: Route) => void;
  recalculate: () => void;
  reset: () => void;
}

export const useSwapStore = create<SwapState>((set, get) => {
  const runRouteCalc = async (fromT: Token, toT: Token, amountStr: string) => {
    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) {
      return { selectedRoute: null, alternativeRoutes: [], toAmount: '' };
    }
    const { winningRoute, alternativeRoutes } = await fetchRoutes(fromT, toT, num);
    return {
      selectedRoute: winningRoute,
      alternativeRoutes,
      toAmount: winningRoute.outputAmount.toFixed(4),
    };
  };

  return {
    fromToken: TOKENS[0], // XLM
    toToken: TOKENS[1],   // USDC
    fromAmount: '',
    toAmount: '',
    slippageTolerance: '0.5',
    customSlippageValue: '',
    selectedRoute: null,
    alternativeRoutes: [],
    isLoadingRoute: false,

    setFromToken: (token) => {
      const { toToken, fromAmount } = get();
      // Guard: Swapping to same token toggles
      let targetTo = toToken;
      if (token.id === toToken.id) {
        targetTo = get().fromToken;
      }
      set({ fromToken: token, toToken: targetTo, isLoadingRoute: true });
      setTimeout(async () => {
        const results = await runRouteCalc(token, targetTo, fromAmount);
        set({ ...results, isLoadingRoute: false });
      }, 350);
    },

    setToToken: (token) => {
      const { fromToken, fromAmount } = get();
      let targetFrom = fromToken;
      if (token.id === fromToken.id) {
        targetFrom = get().toToken;
      }
      set({ toToken: token, fromToken: targetFrom, isLoadingRoute: true });
      setTimeout(async () => {
        const results = await runRouteCalc(targetFrom, token, fromAmount);
        set({ ...results, isLoadingRoute: false });
      }, 350);
    },

    setFromAmount: (amount) => {
      set({ fromAmount: amount });
      const { fromToken, toToken } = get();
      const numVal = parseFloat(amount);
      if (isNaN(numVal) || numVal <= 0) {
        set({ selectedRoute: null, alternativeRoutes: [], toAmount: '' });
        return;
      }

      set({ isLoadingRoute: true });
      // Minor simulate loading frame
      setTimeout(async () => {
        const { fromAmount: latestAmount } = get();
        // Prevent race conditions on state updates
        if (latestAmount !== amount) return;
        const results = await runRouteCalc(fromToken, toToken, amount);
        
        // Smart Slippage auto recommendation rules
        let adaptiveSlippage = get().slippageTolerance;
        const xlmEquiv = numVal / (fromToken.id === 'xlm' ? 1.0 : 0.12);
        if (xlmEquiv > 5000) {
          adaptiveSlippage = '1';
        } else if (xlmEquiv < 200) {
          adaptiveSlippage = '0.1';
        } else {
          adaptiveSlippage = '0.5';
        }

        set({
          ...results,
          slippageTolerance: adaptiveSlippage,
          isLoadingRoute: false,
        });
      }, 250);
    },

    setSlippageTolerance: (tolerance, customVal = '') => {
      set({
        slippageTolerance: tolerance,
        customSlippageValue: customVal,
      });
    },

    swapDirection: () => {
      const { fromToken, toToken, fromAmount, toAmount } = get();
      set({
        fromToken: toToken,
        toToken: fromToken,
        fromAmount: toAmount,
        toAmount: fromAmount,
        isLoadingRoute: true,
      });
      setTimeout(async () => {
        const { fromAmount: latestFrom } = get();
        const results = await runRouteCalc(toToken, fromToken, latestFrom);
         set({ ...results, isLoadingRoute: false });
      }, 350);
    },

    selectRoute: (route) => {
      set({
        selectedRoute: route,
        toAmount: route.outputAmount.toFixed(4),
      });
    },

    recalculate: async () => {
      const { fromToken, toToken, fromAmount } = get();
      if (!fromAmount) return;
      const results = await runRouteCalc(fromToken, toToken, fromAmount);
      set(results);
    },

    reset: () => {
      set({
        fromAmount: '',
        toAmount: '',
        selectedRoute: null,
        alternativeRoutes: [],
      });
    },
  };
});
