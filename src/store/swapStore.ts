'use client';
import { create } from 'zustand';
import { Token, Route, RouteSourceGroup } from '@/types';
import { TOKENS, fetchRoutes } from '@/lib/routing';
import { savingsForRoute, SavingsContext } from '@/lib/savings';

interface SwapState {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  slippageTolerance: string;
  customSlippageValue: string;
  selectedRoute: Route | null;
  allRoutes: Route[];
  routeSources: RouteSourceGroup[];
  alternativeRoutes: Route[];
  savingsContext: SavingsContext;
  isLoadingRoute: boolean;
  setFromToken: (token: Token) => void;
  setToToken: (token: Token) => void;
  setFromAmount: (amount: string) => void;
  setSlippageTolerance: (tolerance: string, customVal?: string) => void;
  swapDirection: () => void;
  selectRoute: (route: Route) => void;
  applyExplorerSelection: (params: {
    fromToken: Token;
    toToken: Token;
    fromAmount: string;
    selectedRoute: Route;
    allRoutes: Route[];
    routeSources: RouteSourceGroup[];
    savingsContext?: SavingsContext;
  }) => void;
  recalculate: () => void;
  reset: () => void;
}

const emptySavingsContext: SavingsContext = {};

export const useSwapStore = create<SwapState>((set, get) => {
  const runRouteCalc = async (fromT: Token, toT: Token, amountStr: string) => {
    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) {
      return {
        selectedRoute: null,
        allRoutes: [],
        routeSources: [],
        alternativeRoutes: [],
        savingsContext: emptySavingsContext,
        toAmount: '',
      };
    }
    const result = await fetchRoutes(fromT, toT, num);
    return {
      selectedRoute: result.winningRoute,
      allRoutes: result.allRoutes,
      routeSources: result.sources,
      alternativeRoutes: result.alternativeRoutes,
      savingsContext: result.savingsContext ?? emptySavingsContext,
      toAmount: result.winningRoute.outputAmount > 0 ? result.winningRoute.outputAmount.toFixed(4) : '',
    };
  };

  return {
    fromToken: TOKENS[0],
    toToken: TOKENS[1],
    fromAmount: '',
    toAmount: '',
    slippageTolerance: '0.5',
    customSlippageValue: '',
    selectedRoute: null,
    allRoutes: [],
    routeSources: [],
    alternativeRoutes: [],
    savingsContext: emptySavingsContext,
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
        set({
          selectedRoute: null,
          allRoutes: [],
          routeSources: [],
          alternativeRoutes: [],
          savingsContext: emptySavingsContext,
          toAmount: '',
        });
        return;
      }

      set({ isLoadingRoute: true });
      setTimeout(async () => {
        const { fromAmount: latestAmount } = get();
        if (latestAmount !== amount) return;

        const results = await runRouteCalc(fromToken, toToken, amount);

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
      }, 400);
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
      const { allRoutes, savingsContext } = get();
      const savedAmount = savingsForRoute(route, allRoutes, savingsContext);
      set({
        selectedRoute: { ...route, savedAmount },
        alternativeRoutes: allRoutes.filter((r) => r.id !== route.id),
        toAmount: route.outputAmount.toFixed(4),
      });
    },

    applyExplorerSelection: ({ fromToken, toToken, fromAmount, selectedRoute, allRoutes, routeSources, savingsContext }) => {
      const ctx = savingsContext ?? emptySavingsContext;
      const savedAmount = savingsForRoute(selectedRoute, allRoutes, ctx);
      set({
        fromToken,
        toToken,
        fromAmount,
        toAmount: selectedRoute.outputAmount.toFixed(4),
        selectedRoute: { ...selectedRoute, savedAmount },
        allRoutes,
        routeSources,
        savingsContext: ctx,
        alternativeRoutes: allRoutes.filter((route) => route.id !== selectedRoute.id),
        isLoadingRoute: false,
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
        allRoutes: [],
        routeSources: [],
        alternativeRoutes: [],
        savingsContext: emptySavingsContext,
      });
    },
  };
});
