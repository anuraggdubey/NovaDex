/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { Token, Route } from './types';
import { TOKENS, calculateRoutes } from './data';

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
  network: 'testnet' | 'mainnet' | null;
  xlmBalance: number;
  balances: { [tokenId: string]: number };
  connect: () => void;
  disconnect: () => void;
  toggleNetwork: () => void;
  refreshBalances: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  publicKey: null,
  network: null,
  xlmBalance: 0,
  balances: {},
  connect: () => {
    // Generate an authentic mock Stellar freighter address
    const mockPublicKey = 'GBAQP6XJ7Z6D6W6EM2D34QJID62SDZPL4H6X7YUTOP';
    set({
      publicKey: mockPublicKey,
      network: 'testnet',
      xlmBalance: 320.50,
      balances: {
        xlm: 320.50,
        usdc: 1500.00,
        aqua: 85203.40,
        yxlm: 140.20,
        shx: 3500.00,
        ars: 0.00,
      },
    });
    useToastStore.getState().addToast('Freighter wallet connected successfully', 'success');
  },
  disconnect: () => {
    set({
      publicKey: null,
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
  const runRouteCalc = (fromT: Token, toT: Token, amountStr: string) => {
    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) {
      return { selectedRoute: null, alternativeRoutes: [], toAmount: '' };
    }
    const { winningRoute, alternativeRoutes } = calculateRoutes(fromT, toT, num);
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
      setTimeout(() => {
        const results = runRouteCalc(token, targetTo, fromAmount);
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
      setTimeout(() => {
        const results = runRouteCalc(targetFrom, token, fromAmount);
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
      setTimeout(() => {
        const { fromAmount: latestAmount } = get();
        // Prevent race conditions on state updates
        if (latestAmount !== amount) return;
        const results = runRouteCalc(fromToken, toToken, amount);
        
        // Smart Slippage auto recommendation rules
        // Highlighted in prompt section 5.2 Slippage Settings:
        // "Adaptive slippage based on order size: smaller pre-select 0.1%, larger or illiquid pre-select higher"
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
      setTimeout(() => {
        const { fromAmount: latestFrom } = get();
        const results = runRouteCalc(toToken, fromToken, latestFrom);
         set({ ...results, isLoadingRoute: false });
      }, 350);
    },

    selectRoute: (route) => {
      set({
        selectedRoute: route,
        toAmount: route.outputAmount.toFixed(4),
      });
    },

    recalculate: () => {
      const { fromToken, toToken, fromAmount } = get();
      if (!fromAmount) return;
      const results = runRouteCalc(fromToken, toToken, fromAmount);
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
