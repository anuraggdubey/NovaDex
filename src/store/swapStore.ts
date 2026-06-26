'use client';
import { create } from 'zustand';
import { Token, Route } from '@/types';
import { TOKENS, fetchRoutes } from '@/lib/routing';

interface SwapState {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  slippageTolerance: string; // '0.1' | '0.5' | '1.0' | 'custom'
  customSlippageValue: string;
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
      toAmount: winningRoute.outputAmount > 0 ? winningRoute.outputAmount.toFixed(4) : '',
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
      let targetTo = toToken;
      if (token.id === toToken.id) targetTo = get().fromToken;
      set({ fromToken: token, toToken: targetTo, isLoadingRoute: true });
      setTimeout(async () => {
        const results = await runRouteCalc(token, targetTo, fromAmount);
        set({ ...results, isLoadingRoute: false });
      }, 350);
    },

    setToToken: (token) => {
      const { fromToken, fromAmount } = get();
      let targetFrom = fromToken;
      if (token.id === fromToken.id) targetFrom = get().toToken;
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
      setTimeout(async () => {
        const { fromAmount: latestAmount } = get();
        if (latestAmount !== amount) return; // Race condition guard

        const results = await runRouteCalc(fromToken, toToken, amount);

        // Smart Slippage Engine (Section 4, Feature 3)
        let adaptiveSlippage = get().slippageTolerance;
        const xlmEquiv = numVal / (fromToken.id === 'xlm' ? 1.0 : 0.12);
        if (xlmEquiv > 5000) {
          adaptiveSlippage = '1.0';
        } else if (xlmEquiv < 200) {
          adaptiveSlippage = '0.1';
        } else {
          adaptiveSlippage = '0.5';
        }

        set({ ...results, slippageTolerance: adaptiveSlippage, isLoadingRoute: false });
      }, 400); // 400ms debounce as documented
    },

    setSlippageTolerance: (tolerance, customVal = '') => {
      set({ slippageTolerance: tolerance, customSlippageValue: customVal });
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
