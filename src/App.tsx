/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDownUp, Activity, History, BookOpen, Layers, Coins, ExternalLink,
  ChevronRight, TrendingUp, MoveRight, Sliders, Check, Settings, Info,
  Search, Shield, BarChart3, Database, Award, Copy, HelpCircle, FileText
} from 'lucide-react';

// Import Types and Data
import { Token, Route, SwapRecord, Pool } from './types';
import { 
  TOKENS, MOCK_GLOBAL_METRICS, MOCK_SWAP_HISTORY, MOCK_POOLS, 
  MOCK_TOP_PAIRS, fetchRoutes 
} from './data';

// Import Stores
import { useWalletStore, useToastStore } from './store';
import { useSwapStore } from './store';

// Import Presentational Components
import { 
  Badge, Spinner, MetricCard, PriceImpactBar, EmptyState, 
  FeatureCard, AccordionItem 
} from './components/UI';
import { 
  TokenIcon, TokenSelector, TokenSelectModal 
} from './components/TokenComponents';
import { 
  RoutePathPills, RouteCard, AlternativeRoutesList 
} from './components/RouteComponents';
import { 
  WalletButton, ToastList, SuccessCard, ConfirmationModal 
} from './components/WalletAndToast';

// Import Recharts for graphs
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, LineChart, Line, CartesianGrid
} from 'recharts';

import { signTransaction } from '@stellar/freighter-api';
import { buildSwapTransaction, submitTransaction } from './utils/stellarTx';

export default function App() {
  // Client location hash routing state
  const [currentPath, setCurrentPath] = useState<string>('landing'); // 'landing', 'swap', 'history', 'analytics', 'routes', 'pools', 'about'
  
  // Wallet Connection variables
  const { publicKey, balances, toggleNetwork, network, connect } = useWalletStore();
  const { addToast } = useToastStore();

  // Route Synchronization listeners
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/app')) {
        const subPage = hash.replace('#/app', '');
        if (subPage === '/history') setCurrentPath('history');
        else if (subPage === '/analytics') setCurrentPath('analytics');
        else if (subPage === '/routes') setCurrentPath('routes');
        else if (subPage === '/pools') setCurrentPath('pools');
        else if (subPage === '/about') setCurrentPath('about');
        else setCurrentPath('swap');
      } else {
        setCurrentPath('landing');
      }
    };
    
    // Set initial route
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (path: string) => {
    if (path === 'landing') {
      window.location.hash = '';
    } else if (path === 'swap') {
      window.location.hash = '#/app';
    } else {
      window.location.hash = `#/app/${path}`;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#1A1D17] text-[#F2EEE2] selection:bg-[#C9A876]/40 selection:text-white">
      
      {/* Toast notifications */}
      <ToastList />

      {/* Conditional: No XLM fee reserve warnings block */}
      {currentPath !== 'landing' && publicKey && balances['xlm'] === 0 && (
        <div className="bg-[#22251E] border-b border-border-default px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-warning-amber animate-pulse" />
            <p className="font-sans text-xs text-text-secondary">
              Warning: Your wallet holds assets but has zero XLM. You need at least 1.0 XLM to pay for ledger gas fees.
            </p>
          </div>
          <button 
            onClick={async () => {
              addToast("Testnet funding initiated...", "info");
              try {
                const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
                if (res.ok) {
                  useWalletStore.setState({ xlmBalance: 10000.0, balances: { ...balances, xlm: 10000.0 } });
                  addToast("Friendbot funded your account on Testnet!", "success");
                } else {
                  addToast("Friendbot funding failed.", "error");
                }
              } catch (e) {
                 addToast("Friendbot funding failed.", "error");
              }
            }} 
            className="text-xs font-sans font-medium text-accent-gold hover:underline flex items-center gap-1"
          >
            Obtain Testnet XLM Faucet ↗
          </button>
        </div>
      )}

      {/* Render layouts dynamically */}
      {currentPath === 'landing' ? (
        <LandingLayout onNavigate={navigateTo} />
      ) : (
        <AppLayout currentPath={currentPath} onNavigate={navigateTo}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPath}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12"
            >
              {currentPath === 'swap' && <SwapView />}
              {currentPath === 'history' && <HistoryView />}
              {currentPath === 'analytics' && <AnalyticsView />}
              {currentPath === 'routes' && <RouteExplorerView />}
              {currentPath === 'pools' && <PoolsView />}
              {currentPath === 'about' && <AboutView />}
            </motion.div>
          </AnimatePresence>
        </AppLayout>
      )}

    </div>
  );
}

// ==========================================
// 1. LANDING PAGE LAYOUT & SECTIONS
// ==========================================
function LandingLayout({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      
      {/* Landing minimal nav */}
      <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? 'bg-bg-base/90 backdrop-blur-md border-b border-border-default' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-text-primary select-none">
              NovaDEX
            </h1>
            <Badge variant="neutral" className="text-[9px] translate-y-0.5">Alpha</Badge>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-sans text-text-secondary">
            <a href="#how-it-works" className="hover:text-text-primary transition-colors">How it works</a>
            <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
            <a href="#about" className="hover:text-text-primary transition-colors">Infrastructure</a>
          </nav>

          <button
            onClick={() => onNavigate('swap')}
            className="px-4 py-2 bg-accent-gold hover:bg-accent-gold-light text-bg-base rounded-lg text-xs sm:text-sm font-sans font-medium transition-all"
          >
            Launch app →
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative w-full max-w-5xl mx-auto px-4 pt-16 md:pt-28 pb-16 text-center flex flex-col items-center">
        <span className="font-serif italic text-xs md:text-sm text-text-secondary uppercase tracking-widest mb-4">
          Stellar's first intent-based DEX aggregator
        </span>
        
        <h1 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-text-primary max-w-4xl leading-tight mb-6">
          Swap any Stellar asset. <br />
          <span className="text-[#C9A876] italic font-normal">Get the best price.</span>
        </h1>

        <p className="font-sans text-sm sm:text-base text-text-secondary max-w-2xl leading-relaxed mb-8">
          NovaDEX checks every source of liquidity on Stellar—order books, AMM pools, and anchor rates—and routes your swap through the best path automatically. No account. No password. Your wallet is your identity.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-16">
          <button
            onClick={() => onNavigate('swap')}
            className="w-full sm:w-auto px-6 py-3 bg-accent-gold hover:bg-accent-gold-light text-bg-base rounded-lg text-sm font-sans font-semibold transition-all duration-150"
          >
            Launch App
          </button>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-6 py-3 border border-border-default hover:border-border-emphasis text-text-secondary hover:text-text-primary rounded-lg text-sm font-sans font-medium transition-all duration-150 text-center"
          >
            How it works
          </a>
        </div>

        {/* Hero Visual: Flat styled static RouteCard preview */}
        <div className="w-full max-w-xl mx-auto border border-border-default rounded-xl bg-bg-surface overflow-hidden text-left p-6 relative">
          <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-accent-gold" />
          <div className="flex justify-between items-center mb-4">
            <span className="font-serif italic text-xs text-text-secondary">Winning live path</span>
            <Badge variant="success">9.8% better price</Badge>
          </div>
          <div className="mb-5">
            <RoutePathPills path={[TOKENS[0], TOKENS[2], TOKENS[1]]} />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border-default text-xs bg-bg-surface">
            <div>
              <span className="font-serif italic text-[11px] text-text-secondary block">You pay</span>
              <span className="font-mono font-medium text-text-primary">1,000.00 XLM</span>
            </div>
            <div>
              <span className="font-serif italic text-[11px] text-text-secondary block">Winning Output</span>
              <span className="font-mono font-bold text-success-green">141.25 USDC</span>
            </div>
            <div>
              <span className="font-serif italic text-[11px] text-text-secondary block">Arbitrage Savings</span>
              <span className="font-mono text-accent-gold">+3.84 USDC</span>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM STRIP */}
      <section className="w-full bg-bg-surface py-16 border-y border-border-default">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-serif text-2xl text-text-primary text-center font-medium mb-12">
            Stellar DeFi has a fragmentation problem
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <span className="font-serif text-lg text-accent-gold italic">[ 01 ]</span>
              <h3 className="font-serif text-base text-text-primary font-medium">Scattered Liquidity</h3>
              <p className="font-sans text-xs sm:text-sm text-text-secondary leading-relaxed">
                Liquidity is scattered across SDEX order books, Aquarius liquidity pools, and anchor fiat-stablecoin rates—with no unified entry point.
              </p>
            </div>

            <div className="space-y-2">
              <span className="font-serif text-lg text-accent-gold italic">[ 02 ]</span>
              <h3 className="font-serif text-base text-text-primary font-medium">Manual Trade Parsing</h3>
              <p className="font-sans text-xs sm:text-sm text-text-secondary leading-relaxed">
                Traders must manually monitor bid/ask depths across multiple pools, compute split-ratios, and execute manual orders.
              </p>
            </div>

            <div className="space-y-2">
              <span className="font-serif text-lg text-accent-gold italic">[ 03 ]</span>
              <h3 className="font-serif text-base text-text-primary font-medium">Value Left Behind</h3>
              <p className="font-sans text-xs sm:text-sm text-text-secondary leading-relaxed">
                Trades executed directly on single pools often suffer significant price slippage. Over 40% of Stellar swaps leave money on the table.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS DIAGRAM */}
      <section id="how-it-works" className="w-full max-w-5xl mx-auto px-4 py-20 text-center">
        <h2 className="font-serif text-2xl text-text-primary mb-3 font-medium">Atomic routing sequence</h2>
        <p className="font-sans text-sm text-text-secondary max-w-xl mx-auto mb-12">
          NovaDEX executes intents atomically through on-chain Soroban routers. Here is the operational loop.
        </p>

        {/* Flow diagram steps */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start relative">
          <div className="p-4 bg-bg-surface border border-border-default rounded-xl">
            <Badge variant="gold" className="mb-2">Phase 1</Badge>
            <h4 className="font-serif italic text-sm text-text-primary mb-1">Trade Intent</h4>
            <p className="font-sans text-xs text-text-secondary leading-normal">
              Enter target assets and amount input.
            </p>
          </div>

          <div className="flex justify-center py-2 md:py-8">
            <span className="font-mono text-text-tertiary select-none rotate-90 md:rotate-0">----&gt;</span>
          </div>

          <div className="p-4 bg-bg-surface border border-border-default rounded-xl">
            <Badge variant="neutral" className="mb-2">Phase 2</Badge>
            <h4 className="font-serif italic text-sm text-text-primary mb-1">Multi-Path Sweep</h4>
            <p className="font-sans text-xs text-text-secondary leading-normal">
              Real-time check on SDEX depth, Aquarius AMMs, and anchors.
            </p>
          </div>

          <div className="flex justify-center py-2 md:py-8">
            <span className="font-mono text-text-tertiary select-none rotate-90 md:rotate-0">----&gt;</span>
          </div>

          <div className="p-4 bg-bg-surface border border-border-default rounded-xl bg-bg-surface">
            <Badge variant="success" className="mb-2">Phase 3</Badge>
            <h4 className="font-serif italic text-sm text-text-primary mb-1">Atomic Execution</h4>
            <p className="font-sans text-xs text-text-secondary leading-normal">
              Soroban compiles split trades into a single immutable ledger event.
            </p>
          </div>
        </div>
      </section>

      {/* UNIQUE FEATURES GRID */}
      <section id="features" className="w-full bg-bg-surface py-20 border-t border-border-default">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-serif text-2xl text-text-primary text-center mb-3 font-medium">
            Engineered for trade excellence
          </h2>
          <p className="font-sans text-sm text-text-secondary text-center max-w-md mx-auto mb-14">
            No marketing hype. Precise on-chain features built for maximum asset preservation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Award className="w-5 h-5" />}
              title="Savings proof, on-chain"
              description="Every routed swap computes the exact price you achieved versus typical single-source pools, recorded as on-chain arbitrage validation."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Wallet-native identity"
              description="Freighter wallet connection allows direct ledger execution. We do not store seed phrases, login credentials, or transactional keys."
            />
            <FeatureCard
              icon={<Sliders className="w-5 h-5" />}
              title="Smart slippage engine"
              description="Highly adaptive slip allowances dynamically computed on order weights and pair volatility, saving transactions from random reverts."
            />
            <FeatureCard
              icon={<Layers className="w-5 h-5" />}
              title="Route fingerprinting"
              description="Identifies routing pathways with cryptographically consistent string formats, creating fully transparent audit pipelines."
            />
            <FeatureCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Market price simulator"
              description="Displays prospective pool depth impact as responsive percentages and asset fractions before you approve a Soroban payload."
            />
            <FeatureCard
              icon={<Coins className="w-5 h-5" />}
              title="Stellar Asset support"
              description="Direct immediate support for standard XLM, anchor-backed stablecoins, as well as yield-bearing liquidity vault tokens."
            />
          </div>
        </div>
      </section>

      {/* GLOBAL STATS STRIP */}
      <section className="w-full max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard 
            label="Total aggregated volume" 
            value={`$${MOCK_GLOBAL_METRICS.totalVolumeUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
            subValue="In USD equivalent"
          />
          <MetricCard 
            label="Completed routed swaps" 
            value={MOCK_GLOBAL_METRICS.totalSwapsCount.toLocaleString()} 
            subValue="Ledger-wide"
          />
          <MetricCard 
            label="Arbitrage savings recorded" 
            value={`$${MOCK_GLOBAL_METRICS.totalSavingsUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
            subValue="Back to traders"
          />
          <MetricCard 
            label="Unique active wallets" 
            value={MOCK_GLOBAL_METRICS.uniqueWalletsCount.toLocaleString()} 
            subValue="Freighter connections"
          />
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="w-full bg-bg-surface py-20 text-center border-t border-border-default">
        <h2 className="font-serif text-3xl text-text-primary mb-3 font-medium">Start swapping smarter</h2>
        <p className="font-sans text-sm text-text-secondary max-w-md mx-auto mb-8">
          Unlock maximum capital efficiency. Connect your Freighter key and discover optimized routes in seconds.
        </p>
        <button
          onClick={() => onNavigate('swap')}
          className="px-8 py-4 bg-accent-gold hover:bg-accent-gold-light text-bg-base rounded-lg text-sm sm:text-base font-sans font-semibold transition-all shadow-md"
        >
          Launch App
        </button>
      </section>

      <footer className="py-6 border-t border-border-default bg-[#161813] text-center text-xs text-text-tertiary">
        <p>NovaDEX — Stellar Intent Aggregator Router • Powered by Soroban & Freighter.</p>
        <p className="mt-1">All numbers shown represent simulated ledger depth indicators.</p>
      </footer>
    </div>
  );
}

// ==========================================
// 2. MAIN APP SHELL & NAVIGATION WRAPPER
// ==========================================
interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

function AppLayout({ children, currentPath, onNavigate }: AppLayoutProps) {
  const { network } = useWalletStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { key: 'swap', label: 'Swap' },
    { key: 'history', label: 'History' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'routes', label: 'Routes' },
    { key: 'pools', label: 'Pools' },
    { key: 'about', label: 'About' },
  ];

  const handleMenuClick = (key: string) => {
    onNavigate(key);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      
      {/* App Fixed Top Navbar */}
      <nav className="sticky top-0 z-40 bg-bg-base border-b border-border-default h-16 flex items-center shrink-0">
        <div className="w-full max-w-7xl mx-auto px-4 flex items-center justify-between">
          
          {/* Logo */}
          <div 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <span className="font-serif text-lg font-semibold text-text-primary group-hover:text-accent-gold transition-colors">
              NovaDEX
            </span>
            <Badge variant="neutral" className="text-[8px] translate-y-0.5">App</Badge>
          </div>

          {/* Center Links (Desktop) */}
          <div className="hidden md:flex items-center gap-6 text-sm font-sans">
            {navItems.map((item) => {
              const isActive = currentPath === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  className={`py-1 bg-transparent hover:text-text-primary font-medium transition-colors ${
                    isActive ? 'text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right Area: Mobile Toggle and WalletButton */}
          <div className="flex items-center gap-2.5">
            <WalletButton />

            {/* Mobile Hamburger menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-text-secondary hover:text-text-primary border border-border-default hover:border-border-emphasis rounded-lg bg-bg-surface"
            >
              <span className="font-mono text-xs">{mobileMenuOpen ? '[ X ]' : '[ = ]'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Expandable Mobile Navigation Slide drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-bg-surface border-b border-border-default text-sm font-sans flex flex-col p-4 space-y-2 z-30 overflow-hidden"
          >
            {navItems.map((item) => {
              const isActive = currentPath === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleMenuClick(item.key)}
                  className={`w-full text-left py-2.5 px-3 rounded-md transition-all ${
                    isActive 
                      ? 'bg-border-default/40 text-text-primary font-semibold' 
                      : 'text-text-secondary hover:bg-border-default/15'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Core View Area */}
      <main className="flex-grow flex flex-col bg-bg-base relative">
        {children}
      </main>

      {/* App Fixed Footer */}
      <footer className="h-14 bg-bg-base border-t border-border-default shrink-0 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-text-tertiary">
          <div className="flex items-center gap-1.5">
            <span>NovaDEX — Stellar intent router</span>
            <span className="text-[10px] select-none text-text-tertiary">·</span>
            <Badge variant="neutral" className="text-[9px] px-1 py-0">{network || 'Disconn.'}</Badge>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-text-secondary transition-colors">GitHub</a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-text-secondary transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// 3. PAGE 1 — SWAP MAIN INTERFACE VIEW
// ==========================================
function SwapView() {
  const { publicKey, balances, connect } = useWalletStore();
  const { addToast } = useToastStore();
  const {
    fromToken, toToken, fromAmount, toAmount, slippageTolerance, customSlippageValue,
    selectedRoute, alternativeRoutes, isLoadingRoute,
    setFromToken, setToToken, setFromAmount, setSlippageTolerance, swapDirection,
    selectRoute, reset
  } = useSwapStore();

  const [slippageOpen, setSlippageOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successPayload, setSuccessPayload] = useState<any | null>(null);

  const handleMaxClick = () => {
    if (!publicKey) return;
    const balance = balances[fromToken.id] || 0;
    
    // For XLM, hold back small ledger gas fee reserve
    if (fromToken.id === 'xlm') {
      const maxSecure = Math.max(0, balance - 1.50);
      setFromAmount(maxSecure.toString());
      addToast(`Applying max balance reserve limit: ${maxSecure.toFixed(2)} XLM`, "info");
    } else {
      setFromAmount(balance.toString());
    }
  };

  const handleCustomSlippageChange = (val: string) => {
    // Only permit decimal numbers
    if (/^[0-9.]*$/.test(val)) {
      setSlippageTolerance('custom', val);
    }
  };

  const handleTriggerConfirm = () => {
    if (!publicKey) {
      connect('freighter');
      return;
    }
    setConfirmOpen(true);
  };

  const handleExecuteSwap = async () => {
    if (!publicKey || !selectedRoute) return;
    setConfirmOpen(false);
    
    try {
      addToast('Building transaction...', 'info');
      const activeSlippageVal = slippageTolerance === 'custom' ? customSlippageValue : slippageTolerance;
      
      const xdr = await buildSwapTransaction(
        publicKey,
        selectedRoute,
        fromAmount,
        activeSlippageVal || '0.5'
      );

      addToast('Awaiting signature in Freighter...', 'warning');
      const signedResponse = await signTransaction(xdr, { networkPassphrase: 'Test SDF Network ; September 2015' });
      
      if (signedResponse.error) {
        const errMsg = typeof signedResponse.error === 'string' 
          ? signedResponse.error 
          : JSON.stringify(signedResponse.error);
        throw new Error(errMsg);
      }

      addToast('Submitting to Stellar network...', 'info');
      const submitResponse = await submitTransaction(signedResponse.signedTxXdr);
      
      if (submitResponse.successful) {
        setSuccessPayload({
          fromToken,
          toToken,
          fromAmount,
          toAmount,
          savedAmount: selectedRoute ? selectedRoute.savedAmount : 0,
          txHash: submitResponse.hash
        });
        addToast('Transaction confirmed on ledger successfully', 'success');
        reset();
      } else {
        throw new Error('Transaction submission failed');
      }
    } catch (error: any) {
      console.error(error);
      let errMsg = error.message || 'Unknown error';
      if (error.response?.data?.extras?.result_codes) {
        errMsg = `Ledger failed: ${JSON.stringify(error.response.data.extras.result_codes)}`;
      }
      addToast(`Swap failed: ${errMsg}`, 'error');
    }
  };

  const activeSlippageVal = slippageTolerance === 'custom' ? customSlippageValue : slippageTolerance;

  if (successPayload) {
    return (
      <SuccessCard
        {...successPayload}
        onReset={() => setSuccessPayload(null)}
      />
    );
  }

  const isInputsEntered = parseFloat(fromAmount) > 0;

  return (
    <div className="w-full max-w-[480px] mx-auto space-y-4">
      
      {/* Swapping form card */}
      <div className="p-5 sm:p-6 bg-bg-surface border border-border-default rounded-xl shadow-lg relative">
        <h2 className="font-serif text-lg text-text-primary font-medium border-b border-border-default pb-3.5 mb-5 flex justify-between items-center">
          <span>Stellar Intent Ledger</span>
          {isInputsEntered && isLoadingRoute && <Spinner className="w-4 h-4" />}
        </h2>

        <div className="space-y-4">
          
          {/* User pay block */}
          <div className="p-4 bg-bg-base/50 rounded-xl border border-border-default/60">
            <div className="flex justify-between items-center mb-1 bg-transparent">
              <span className="font-serif italic text-xs text-text-secondary select-none">You pay</span>
              {publicKey && (
                <div className="flex items-center gap-1 bg-transparent">
                  <span className="font-mono text-xs text-text-tertiary select-none">Balance:</span>
                  <span className="font-mono text-xs text-text-secondary font-semibold">
                    {(balances[fromToken.id] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 bg-transparent">
              <input
                type="text"
                inputMode="decimal"
                pattern="^[0-9]*[.,]?[0-9]*$"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  if (/^[0-9.]*$/.test(val)) setFromAmount(val);
                }}
                className="font-mono text-2xl sm:text-3xl font-medium text-text-primary bg-transparent outline-none w-full border-none p-0 focus:ring-0"
              />
              <div className="flex items-center gap-1.5 shrink-0 bg-transparent">
                {publicKey && (balances[fromToken.id] ?? 0) > 0 && (
                  <button
                    onClick={handleMaxClick}
                    className="px-1.5 py-0.5 rounded-sm bg-border-default/45 text-[10px] font-sans font-bold text-accent-gold hover:bg-border-default hover:text-accent-gold-light transition-all uppercase"
                  >
                    Max
                  </button>
                )}
                <TokenSelector token={fromToken} onSelect={setFromToken} />
              </div>
            </div>
          </div>

          {/* Swap Direction Arrow Toggle Button */}
          <div className="flex justify-center -my-2.5 relative z-10">
            <button
              onClick={swapDirection}
              className="p-2 border border-border-default bg-bg-surface hover:border-border-emphasis text-text-secondary hover:text-text-primary rounded-full transition-all focus:outline-none"
            >
              <ArrowDownUp className="w-3.5 h-3.5 hover:rotate-180 transition-transform duration-300" />
            </button>
          </div>

          {/* User receive block */}
          <div className="p-4 bg-bg-base/50 rounded-xl border border-border-default/60">
            <div className="flex justify-between items-center mb-1 bg-transparent">
              <span className="font-serif italic text-xs text-text-secondary select-none">You receive</span>
              {publicKey && (
                <div className="flex items-center gap-1 bg-transparent">
                  <span className="font-mono text-xs text-text-tertiary select-none">Balance:</span>
                  <span className="font-mono text-xs text-text-secondary">
                    {(balances[toToken.id] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 bg-transparent">
              <div className="w-full">
                {isLoadingRoute ? (
                  <div className="h-8 w-28 bg-[#2A2D24] animate-pulse rounded-md" />
                ) : (
                  <span className="font-mono text-2xl sm:text-3xl font-semibold text-text-primary block overflow-hidden text-ellipsis whitespace-nowrap">
                    {toAmount || '0.00'}
                  </span>
                )}
              </div>
              <div className="shrink-0 bg-transparent">
                <TokenSelector token={toToken} onSelect={setToToken} />
              </div>
            </div>
          </div>

          {/* Savings highlights badge */}
          {selectedRoute && selectedRoute.savedAmount > 0 && (
            <div className="p-2.5 bg-success-green/10 border border-success-green/20 rounded-lg flex items-center justify-between">
              <span className="text-[11px] font-sans text-text-secondary font-medium">Arbitrage efficiency value</span>
              <Badge variant="success">
                Saved {selectedRoute.savedAmount.toFixed(4)} vs direct pool
              </Badge>
            </div>
          )}

          {/* Price impact indicators */}
          {selectedRoute && (
            <PriceImpactBar percent={selectedRoute.priceImpactPercent} />
          )}

          {/* Slippage Settings gear inline */}
          <div className="border-t border-border-default/50 pt-3">
            <div className="flex justify-between items-center text-xs">
              <button
                onClick={() => setSlippageOpen(!slippageOpen)}
                className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors focus:outline-none bg-bg-surface"
              >
                <Settings className="w-3.5 h-3.5 text-text-tertiary" />
                <span>Adjust slippage envelope</span>
              </button>
              <span className="font-mono text-text-secondary">{activeSlippageVal}% tolerance</span>
            </div>

            <AnimatePresence>
              {slippageOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-2 bg-transparent"
                >
                  <div className="flex items-center gap-1.5 p-2 bg-bg-base/50 rounded-lg border border-border-default/40">
                    {['0.1', '0.5', '1.0'].map((preset) => {
                      const isSelected = slippageTolerance === preset;
                      return (
                        <button
                          key={preset}
                          onClick={() => setSlippageTolerance(preset)}
                          className={`flex-1 py-1 px-2 rounded-md font-mono text-xs transition-all border ${
                            isSelected 
                              ? 'bg-border-default/50 border-accent-gold text-text-primary' 
                              : 'border-border-default/40 text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {preset}%
                        </button>
                      );
                    })}

                    <div className="relative flex-1 flex items-center">
                      <input
                        type="text"
                        placeholder="Custom"
                        value={customSlippageValue}
                        onChange={(e) => handleCustomSlippageChange(e.target.value)}
                        className={`w-full py-1 pl-2 pr-4 bg-transparent border rounded-md text-xs font-mono text-text-primary focus:outline-none ${
                          slippageTolerance === 'custom' ? 'border-accent-gold' : 'border-border-default/40'
                        }`}
                        onClick={() => setSlippageTolerance('custom', customSlippageValue || '1.0')}
                      />
                      <span className="absolute right-2 text-[10px] text-text-tertiary select-none">%</span>
                    </div>
                  </div>
                  
                  <span className="block text-[11px] font-serif italic text-text-tertiary mt-1.5 leading-tight px-1 text-left">
                    {parseFloat(fromAmount) > 5000 
                      ? "Recommended: 1.0% due to larger split price impact parameters." 
                      : "Recommended: 0.1% or 0.5% default preset for minor amounts."}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action swap execution button */}
          <button
            onClick={handleTriggerConfirm}
            disabled={isInputsEntered && isLoadingRoute}
            className={`w-full py-3.5 rounded-lg text-sm font-sans font-semibold transition-all duration-150 flex items-center justify-center gap-2 ${
              isInputsEntered 
                ? 'bg-[#C9A876] hover:bg-[#D4B888] text-[#1A1D17]' 
                : 'bg-transparent border border-border-default text-text-tertiary cursor-not-allowed'
            }`}
          >
            {isLoadingRoute ? (
              <>
                <Spinner className="w-4 h-4" />
                <span>Simulating routing sequence...</span>
              </>
            ) : !publicKey ? (
              <span>Connect Wallet to Swap</span>
            ) : !isInputsEntered ? (
              <span>Enter an amount to begin</span>
            ) : (
              <span>Review Swap Intent</span>
            )}
          </button>

        </div>
      </div>

      {/* Signature Route breakdown cards */}
      {selectedRoute && isInputsEntered && !isLoadingRoute && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          <RouteCard route={selectedRoute} fromAmount={fromAmount} />
          
          <AlternativeRoutesList
            routes={alternativeRoutes}
            selectedRouteId={selectedRoute.id}
            onSelectRoute={selectRoute}
          />
        </motion.div>
      )}

      {/* Modal dialog confirming swap */}
      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleExecuteSwap}
        fromToken={fromToken}
        toToken={toToken}
        fromAmount={fromAmount}
        route={selectedRoute}
        slippagePercent={activeSlippageVal}
      />

    </div>
  );
}

// ==========================================
// 4. PAGE 2 — HISTORY SECURE TABLE VIEW
// ==========================================
function HistoryView() {
  const { publicKey, connect } = useWalletStore();
  const [historyItems, setHistoryItems] = useState<SwapRecord[]>(MOCK_SWAP_HISTORY);
  const [filterPair, setFilterPair] = useState('All');
  const [filterPeriod, setFilterPeriod] = useState('All time');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchHistory, setSearchHistory] = useState('');

  if (!publicKey) {
    return (
      <div className="w-full max-w-md mx-auto pt-12">
        <EmptyState
          title="Connect key to view ledger histories"
          description="We fetch all historical on-chain aggregates linked to your unique public key directly from the indexer."
          btnLabel="Connect Freighter Wallet"
          onBtnClick={() => connect('freighter')}
          icon={<History className="w-8 h-8 text-accent-gold" />}
        />
      </div>
    );
  }

  // Filter listings
  const filteredSwaps = historyItems.filter((item) => {
    // Pair
    if (filterPair !== 'All' && 
        `${item.fromToken.ticker} / ${item.toToken.ticker}` !== filterPair && 
        `${item.toToken.ticker} / ${item.fromToken.ticker}` !== filterPair) {
      return false;
    }
    // Status
    if (filterStatus !== 'All' && item.status !== filterStatus) return false;
    // Search ticker query
    if (searchHistory !== '') {
      const q = searchHistory.toLowerCase();
      const match = item.fromToken.ticker.toLowerCase().includes(q) || 
                    item.toToken.ticker.toLowerCase().includes(q) ||
                    item.routePathString.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Metrics strip overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Your aggregated swap volume" value="$1,328.50" subValue="Mock session balance" />
        <MetricCard label="Your recorded transaction savings" value="$31.42" subValue="Arbitrage capital recovered" />
        <MetricCard label="Committed ledger trades" value="5 swaps" subValue="1 reverted session" />
      </div>

      <div className="p-5 bg-bg-surface border border-border-default rounded-xl">
        <h2 className="font-serif text-lg text-text-primary font-medium border-b border-border-default pb-3.5 mb-5 select-none">
          Historical ledger records
        </h2>

        {/* Filter Toolbar row */}
        <div className="flex flex-col md:flex-row gap-3 justify-between mb-5">
          <div className="flex flex-wrap items-center gap-1.5 font-sans text-xs">
            {/* Pair Filters */}
            <select
              value={filterPair}
              onChange={(e) => setFilterPair(e.target.value)}
              className="bg-bg-base border border-border-default rounded-lg text-xs py-1.5 px-2.5 focus:outline-none focus:border-accent-gold text-text-secondary"
            >
              <option value="All">All asset pairs</option>
              <option value="XLM / USDC">XLM / USDC</option>
              <option value="XLM / AQUA">XLM / AQUA</option>
              <option value="USDC / ARS">USDC / ARS</option>
            </select>

            {/* Status Filters */}
            <div className="flex items-center border border-border-default rounded-lg bg-bg-base p-0.5 overflow-hidden">
              {['All', 'Completed', 'Reverted'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2 py-1 select-none ${
                    filterStatus === st 
                      ? 'bg-border-default/60 text-text-primary rounded-md font-medium' 
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search history by asset ticker..."
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-bg-base border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-gold"
            />
          </div>
        </div>

        {/* Dense Ledger list table */}
        <div className="overflow-x-auto border border-border-default rounded-lg bg-bg-base/30">
          <table className="w-full text-left font-sans text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-border-default bg-bg-base/80 text-text-secondary font-serif italic">
                <th className="p-3">Execute timestamp</th>
                <th className="p-3">Asset pair pair</th>
                <th className="p-3">Pay input</th>
                <th className="p-3">Receive output</th>
                <th className="p-3">Savings</th>
                <th className="p-3">Route executed</th>
                <th className="p-3">Sim status</th>
                <th className="p-3 text-right">Receipt hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/50 font-sans">
              {filteredSwaps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 p-3 text-center">
                    <span className="font-serif italic text-text-secondary text-sm">No transaction ledger records correspond to search criteria</span>
                  </td>
                </tr>
              ) : (
                filteredSwaps.map((item) => {
                  const date = new Date(item.timestamp).toLocaleString();
                  const isSuccess = item.status === 'Completed';

                  return (
                    <tr key={item.id} className="hover:bg-bg-surface/30 group">
                      <td className="p-3 font-mono text-text-secondary leading-normal">{date}</td>
                      <td className="p-3 font-mono font-medium flex items-center gap-2 pt-4">
                        <TokenIcon token={item.fromToken} size={16} />
                        <TokenIcon token={item.toToken} size={16} />
                        <span>{item.fromToken.ticker} / {item.toToken.ticker}</span>
                      </td>
                      <td className="p-3 font-mono">
                        {item.amountIn.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] text-text-tertiary select-none">{item.fromToken.ticker}</span>
                      </td>
                      <td className={`p-3 font-mono font-semibold ${isSuccess ? 'text-success-green' : 'text-text-primary'}`}>
                        {item.amountOut.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] text-text-tertiary select-none">{item.toToken.ticker}</span>
                      </td>
                      <td className="p-3 font-mono text-accent-gold font-medium">
                        {item.savings > 0 ? `+${item.savings.toFixed(2)}` : '--'}
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[10px] text-text-secondary bg-[#2E3129] px-1.5 py-0.5 rounded-sm">
                          {item.routePathString}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={isSuccess ? 'success' : 'danger'}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono text-text-tertiary group-hover:text-accent-gold transition-colors duration-150">
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${item.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline inline-flex items-center gap-1"
                        >
                          {item.txHash.substring(0, 6)}...{item.txHash.substring(item.txHash.length - 6)}
                          <ExternalLink className="w-3 h-3 text-text-tertiary shrink-0" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ==========================================
// 5. PAGE 3 — ANALYTICS GRAPHICAL VIEW
// ==========================================
function AnalyticsView() {
  const { publicKey, connect } = useWalletStore();

  // Mock static historical graph series
  const volumeHistoryData = [
    { date: 'Jun 08', volUsd: 180200, trades: 3102 },
    { date: 'Jun 09', volUsd: 220500, trades: 3840 },
    { date: 'Jun 10', volUsd: 195000, trades: 3206 },
    { date: 'Jun 11', volUsd: 245000, trades: 4104 },
    { date: 'Jun 12', volUsd: 310200, trades: 5208 },
    { date: 'Jun 13', volUsd: 285400, trades: 4940 },
    { date: 'Jun 14', volUsd: 382400, trades: 5904 },
  ];

  const savingsTrendsData = [
    { date: 'Jun 08', savingsUsd: 3100 },
    { date: 'Jun 09', savingsUsd: 4200 },
    { date: 'Jun 10', savingsUsd: 3800 },
    { date: 'Jun 11', savingsUsd: 5900 },
    { date: 'Jun 12', savingsUsd: 7100 },
    { date: 'Jun 13', savingsUsd: 6500 },
    { date: 'Jun 14', savingsUsd: 9400 },
  ];

  return (
    <div className="space-y-6">
      
      {/* Global Ledger Totals strip */}
      <h2 className="font-serif text-lg text-text-primary font-medium border-b border-border-default pb-2 select-none">
        Ledger-wide performance metrics
      </h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="NovaDEX total swap volume" value="$14,209,584" subValue="Cumulative USD equivalent" />
        <MetricCard label="Total liquidity channels scanned" value="51 channels" subValue="SDEX order books + Aquarius AMMs" />
        <MetricCard label="Aggregate arbitrage savings" value="$312,056" subValue="Returned directly to traders" />
        <MetricCard label="Average price improvements" value="2.42%" subValue="Versus direct source routes" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-200">
        
        {/* Graph: Cumulative Volume */}
        <div className="p-5 bg-bg-surface border border-border-default rounded-xl">
          <span className="font-serif italic text-xs text-text-secondary block mb-0.5">Aggregated weekly volumes</span>
          <h3 className="font-serif text-base font-semibold text-text-primary mb-5 select-none">Total trade volume over time</h3>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A876" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#C9A876" stopOpacity={0.005}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="#3A3D33" 
                  tick={{ fill: '#6E6B5F', fontSize: 11, fontFamily: 'JetBrains Mono' }} 
                />
                <YAxis 
                  stroke="#3A3D33" 
                  tickFormatter={(val) => `$${(val / 1000)}k`}
                  tick={{ fill: '#6E6B5F', fontSize: 11, fontFamily: 'JetBrains Mono' }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#22251E', borderColor: '#3A3D33', color: '#F2EEE2', fontFamily: 'Inter' }}
                  labelStyle={{ fontFamily: 'Fraunces', fontStyle: 'italic', color: '#9B9788' }}
                />
                <Area type="monotone" dataKey="volUsd" stroke="#C9A876" strokeWidth={1.5} fillOpacity={1} fill="url(#colorVol)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph: Cumulative Savings */}
        <div className="p-5 bg-bg-surface border border-border-default rounded-xl">
          <span className="font-serif italic text-xs text-text-secondary block mb-0.5">Aggregated weekly saves</span>
          <h3 className="font-serif text-base font-semibold text-text-primary mb-5 select-none">Total arbitrage value rescued</h3>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="date" 
                  stroke="#3A3D33" 
                  tick={{ fill: '#6E6B5F', fontSize: 11, fontFamily: 'JetBrains Mono' }} 
                />
                <YAxis 
                  stroke="#3A3D33" 
                  tickFormatter={(val) => `$${(val / 1000)}k`}
                  tick={{ fill: '#6E6B5F', fontSize: 11, fontFamily: 'JetBrains Mono' }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#22251E', borderColor: '#3A3D33', color: '#F2EEE2', fontFamily: 'Inter' }}
                  labelStyle={{ fontFamily: 'Fraunces', fontStyle: 'italic', color: '#9B9788' }}
                />
                <Bar dataKey="savingsUsd" fill="#A8C97F" radius={[2, 2, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Assets table info */}
      <div className="p-5 bg-bg-surface border border-border-default rounded-xl">
        <h3 className="font-serif text-base font-semibold text-text-primary mb-4 select-none">Leading ledger volume pairs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-border-default text-text-secondary font-serif italic pb-2">
                <th className="py-2.5">Pair ticker name</th>
                <th className="py-2.5">TVL value locked</th>
                <th className="py-2.5">24h traded volume</th>
                <th className="py-2.5">24h swap aggregate count</th>
                <th className="py-2.5 text-right">Average dynamic savings achiev.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/50 font-mono">
              {MOCK_TOP_PAIRS.map((p, idx) => (
                <tr key={idx} className="hover:bg-bg-base/30">
                  <td className="py-3 font-semibold text-text-primary flex items-center gap-2">
                    <TokenIcon token={p.tokenA} size={16} />
                    <TokenIcon token={p.tokenB} size={16} />
                    <span className="font-mono tracking-wider">{p.pairString}</span>
                  </td>
                  <td className="py-3 text-text-secondary">${(p.volume24h * 11.2).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="py-3 text-text-primary">${p.volume24h.toLocaleString()}</td>
                  <td className="py-3 text-text-secondary">{p.swapCount24h.toLocaleString()} swaps</td>
                  <td className="py-3 text-success-green font-semibold text-right">+${p.avgSavingsUSD.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Personal Analytics block with overlay warning constraints */}
      <div className="relative border border-border-default rounded-xl overflow-hidden p-5 bg-bg-surface">
        {!publicKey && (
          <div className="absolute inset-0 bg-[#1A1D17]/85 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6">
            <BarChart3 className="w-10 h-10 text-accent-gold mb-3 opacity-85 animate-bounce" />
            <span className="font-serif text-lg font-medium text-text-primary">Connect Freighter key to unlock analytics</span>
            <p className="font-sans text-xs text-text-secondary max-w-sm mt-1 mb-4 leading-relaxed">
              We compile wallet-specific statistics of trading behaviors, slippages utilized, and cumulative capital preserved.
            </p>
            <button
              onClick={() => connect('freighter')}
              className="px-4 py-2 bg-accent-gold hover:bg-accent-gold-light text-[#1A1D17] text-xs font-sans font-semibold rounded-lg shadow-md transition-all"
            >
              Connect Wallet
            </button>
          </div>
        )}

        <h3 className="font-serif text-base font-semibold text-text-primary mb-3.5">Your personal performance audit</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3.5">
            <div className="p-3.5 bg-bg-base/40 border border-border-default/45 rounded-lg flex justify-between items-center text-xs">
              <span className="font-serif italic text-text-secondary">Average Slippage allowance</span>
              <span className="font-mono text-text-primary font-medium">0.34%</span>
            </div>
            <div className="p-3.5 bg-bg-base/40 border border-border-default/45 rounded-lg flex justify-between items-center text-xs">
              <span className="font-serif italic text-text-secondary">Signature Winning split path</span>
              <span className="font-mono text-accent-gold font-medium">XLM → AQUA → USDC</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-serif italic text-xs text-text-secondary">Favored asset pathways</h4>
            <div className="space-y-1.5">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-mono text-text-secondary">
                  <span>XLM / USDC</span>
                  <span>78% trades</span>
                </div>
                <div className="h-1 w-full bg-border-default rounded-full overflow-hidden">
                  <div className="h-full bg-accent-gold rounded-full" style={{ width: '78%' }} />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-mono text-text-secondary">
                  <span>XLM / AQUA</span>
                  <span>22% trades</span>
                </div>
                <div className="h-1 w-full bg-border-default rounded-full overflow-hidden">
                  <div className="h-full bg-accent-gold rounded-full" style={{ width: '22%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ==========================================
// 6. PAGE 4 — ROUTE EXPLORER POWER-USER VIEW
// ==========================================
function RouteExplorerView() {
  const [assetA, setAssetA] = useState<Token>(TOKENS[0]); // XLM
  const [assetB, setAssetB] = useState<Token>(TOKENS[1]); // USDC
  const [explorerAmount, setExplorerAmount] = useState<string>('1500');
  const [calculatedList, setCalculatedList] = useState<Route[]>([]);
  const [searching, setSearching] = useState(false);
  const [orderSizeSliderValue, setOrderSizeSliderValue] = useState(50); // percentage scaled slider

  const runExplorerCalculations = () => {
    if (!explorerAmount || parseFloat(explorerAmount) <= 0) return;
    setSearching(true);
    setTimeout(async () => {
      // dynamically fetch
      const val = parseFloat(explorerAmount);
      const { winningRoute, alternativeRoutes } = await fetchRoutes(assetA, assetB, val);
      setCalculatedList([winningRoute, ...alternativeRoutes]);
      setSearching(false);
    }, 400);
  };

  useEffect(() => {
    runExplorerCalculations();
  }, [assetA, assetB]);

  // Adjust routing results on order size slider
  const handleSliderChange = (newVal: number) => {
    setOrderSizeSliderValue(newVal);
    // adjust base amount exponentially 10 to 100,000 range
    const computedAmount = Math.round(Math.pow(10, 1 + newVal / 25));
    setExplorerAmount(computedAmount.toString());
  };

  // Debounced amount calculations trigger
  useEffect(() => {
    if (calculatedList.length > 0) {
      const val = parseFloat(explorerAmount) || 0;
      if (val > 0) {
        (async () => {
          const { winningRoute, alternativeRoutes } = await fetchRoutes(assetA, assetB, val);
          setCalculatedList([winningRoute, ...alternativeRoutes]);
        })();
      }
    }
  }, [explorerAmount]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Selector panel */}
      <div className="p-5 bg-bg-surface border border-border-default rounded-xl">
        <h2 className="font-serif text-lg text-text-primary font-medium border-b border-border-default pb-3.5 mb-5 flex justify-between items-center select-none">
          <span>Stellar Route Explorer</span>
          {searching && <Spinner className="w-4.5 h-4.5" />}
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 grow w-full">
            <div className="flex-1">
              <span className="font-serif italic text-xs text-text-secondary block mb-1">Source Asset</span>
              <TokenSelector token={assetA} onSelect={setAssetA} />
            </div>

            <ChevronRight className="w-4 h-4 text-text-tertiary mt-5 shrink-0" />

            <div className="flex-1">
              <span className="font-serif italic text-xs text-text-secondary block mb-1">Destination Asset</span>
              <TokenSelector token={assetB} onSelect={setAssetB} />
            </div>
          </div>

          <div className="w-full sm:w-44">
            <span className="font-serif italic text-xs text-text-secondary block mb-1">Explore Amount</span>
            <input
              type="text"
              value={explorerAmount}
              onChange={(e) => {
                const val = e.target.value.replace(',', '.');
                if (/^[0-9.]*$/.test(val)) setExplorerAmount(val);
              }}
              className="w-full py-1.5 px-3 bg-bg-base border border-border-default focus:border-accent-gold rounded-lg font-mono text-sm text-text-primary focus:outline-none"
            />
          </div>

          <button
            onClick={runExplorerCalculations}
            className="w-full sm:w-auto px-5 py-2 mt-5 bg-[#C9A876] hover:bg-[#D4B888] text-bg-base font-sans font-semibold text-sm rounded-lg transition-all shadow-sm"
          >
            Find pathways
          </button>
        </div>
      </div>

      {/* Route comparisons table */}
      <div className="p-5 bg-bg-surface border border-border-default rounded-xl">
        <div className="flex justify-between items-center mb-4 select-none">
          <h3 className="font-serif text-base font-semibold text-text-primary">Simulated routing options</h3>
          <Badge variant="neutral">Sorted by yield output</Badge>
        </div>

        <div className="overflow-x-auto border border-border-default rounded-lg">
          <table className="w-full text-left font-sans text-xs min-w-[650px]">
            <thead>
              <tr className="border-b border-border-default bg-bg-base/70 font-serif italic text-text-secondary">
                <th className="p-3">Execution path flow</th>
                <th className="p-3">Route protocol scope</th>
                <th className="p-3">Calculation output</th>
                <th className="p-3">Split fee</th>
                <th className="p-3">Price impact</th>
                <th className="p-3 text-right">Route status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/50 font-mono">
              {calculatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <span className="font-serif italic text-text-secondary text-sm">Enter search params to evaluate paths</span>
                  </td>
                </tr>
              ) : (
                calculatedList.map((route, rIndex) => {
                  const isWinner = rIndex === 0;
                  const dest = route.path[route.path.length - 1];

                  const getImpactColor = (val: number) => {
                    if (val < 1.0) return 'text-success-green';
                    if (val <= 3.0) return 'text-warning-amber';
                    return 'text-danger-rose';
                  };

                  return (
                    <tr 
                      key={route.id + '-' + rIndex} 
                      className={`hover:bg-bg-base/35 transition-colors ${
                        isWinner ? 'bg-[#252820]/90 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3">
                        <RoutePathPills path={route.path} size="sm" />
                      </td>
                      <td className="p-3 font-sans text-text-secondary">
                        {route.hopsDetails.map(h => h.source).join(' + ') || 'SDEX Orderbook'}
                      </td>
                      <td className="p-3 font-bold text-text-primary">
                        {route.outputAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{' '}
                        <span className="text-[10px] font-normal text-text-tertiary select-none">{dest.ticker}</span>
                      </td>
                      <td className="p-3 text-text-secondary">{route.feePercent.toFixed(2)}%</td>
                      <td className={`p-3 font-bold ${getImpactColor(route.priceImpactPercent)}`}>
                        {route.priceImpactPercent.toFixed(2)}%
                      </td>
                      <td className="p-3 text-right">
                        {isWinner ? (
                          <Badge variant="success">Optimal Route</Badge>
                        ) : (
                          <span className="text-[11px] font-sans text-text-tertiary">Backup pathway</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slider scaling order sizes dynamic testing */}
      <div className="p-5 bg-bg-surface border border-border-default rounded-xl space-y-4">
        <div className="flex justify-between items-center select-none">
          <div>
            <h3 className="font-serif text-base font-semibold text-text-primary">Order Size Aggregation Tester</h3>
            <span className="font-sans text-[11px] text-text-secondary">Slide to simulate massive trade sizes up to 100,000 keys.</span>
          </div>
          <span className="font-mono text-sm font-bold text-accent-gold block border border-border-default/60 px-3 py-1 bg-bg-base rounded-md">
            {parseInt(explorerAmount).toLocaleString()} {assetA.ticker}
          </span>
        </div>

        <div className="space-y-1 py-1.5">
          <input
            type="range"
            min={5}
            max={99}
            value={orderSizeSliderValue}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            className="w-full accent-accent-gold cursor-pointer bg-border-default h-1 rounded"
          />
          <div className="flex justify-between text-[11px] font-mono text-text-tertiary">
            <span>Minimum order depth (10)</span>
            <span>Split Router cross-over boundary (~12,500)</span>
            <span>Massive liquidity block (100k)</span>
          </div>
        </div>

        <div className="p-3.5 bg-bg-base/40 rounded-lg border border-border-default/45 flex items-center gap-2 text-xs">
          <Info className="w-4 h-4 text-accent-gold shrink-0" />
          <p className="font-sans text-text-secondary leading-normal">
            Notice that at larger values, NovaDEX multi-path routes split trade allocations across SDEX order depth spreads and Aquarius pools to enforce minimal slippage, whereas direct single routes receive heavy price penalties.
          </p>
        </div>
      </div>

      {/* Split details layout cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-bg-surface border border-border-default rounded-xl">
          <Badge variant="neutral" className="mb-2">Liquidity Class</Badge>
          <h4 className="font-serif text-base text-text-primary font-medium leading-tight">SDEX Orderbooks</h4>
          <p className="font-sans text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
            Checks directly on-chain. Fits single tight orders immediately with 0.15% base routing commission parameters.
          </p>
        </div>

        <div className="p-4 bg-bg-surface border border-border-default rounded-xl">
          <Badge variant="gold" className="mb-2">Liquidity Class</Badge>
          <h4 className="font-serif text-base text-text-primary font-medium leading-tight">Aquarius AMM Pools</h4>
          <p className="font-sans text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
            Accesses active pool pairs. Generates consistent trades with 0.30% LP fee configurations.
          </p>
        </div>

        <div className="p-4 bg-bg-surface border border-border-default rounded-xl">
          <Badge variant="neutral" className="mb-2">Liquidity Class</Badge>
          <h4 className="font-serif text-base text-text-primary font-medium leading-tight">Fiat Anchor Gateways</h4>
          <p className="font-sans text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
            Renders anchor-stable conversions directly matching native fiat values smoothly with 0.10% processing parameters.
          </p>
        </div>
      </div>

    </div>
  );
}

// ==========================================
// 7. PAGE 5 — LIQUIDITY POOLS VIEW
// ==========================================
function PoolsView() {
  const [selectedPoolForDetail, setSelectedPoolForDetail] = useState<Pool | null>(null);

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center border-b border-border-default pb-3.5 select-none">
        <div>
          <h1 className="font-serif text-2xl text-text-primary font-medium">Aggregated liquidity pools</h1>
          <p className="font-sans text-xs text-text-secondary mt-0.5">Scanned on-chain liquidity systems in the Stellar network.</p>
        </div>
        <Badge variant="neutral">Refreshed 60s ago</Badge>
      </div>

      {/* Pools Dense table list */}
      <div className="p-5 bg-bg-surface border border-border-default rounded-xl">
        <div className="overflow-x-auto border border-border-default rounded-lg">
          <table className="w-full text-left font-sans text-xs min-w-[650px]">
            <thead>
              <tr className="border-b border-border-default bg-bg-base/70 font-serif italic text-text-secondary">
                <th className="p-3">Integrator Pool</th>
                <th className="p-3">TVL dynamic size</th>
                <th className="p-3">24h trades volume</th>
                <th className="p-3">Provider fee parameters</th>
                <th className="p-3">NovaDEX Routed share</th>
                <th className="p-3 text-right">Integrator status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/50 font-mono">
              {MOCK_POOLS.map((pool) => {
                const routedPercent = (pool.routingVolume / pool.volume24h) * 100;
                
                return (
                  <tr 
                    key={pool.id} 
                    onClick={() => setSelectedPoolForDetail(pool)}
                    className="hover:bg-bg-base/40 cursor-pointer group transition-colors"
                  >
                    <td className="p-3 font-semibold text-text-primary font-mono flex items-center gap-2 pt-4.5">
                      <TokenIcon token={pool.tokenA} size={18} />
                      <TokenIcon token={pool.tokenB} size={18} />
                      <span className="hover:text-accent-gold transition-colors">{pool.tokenA.ticker} / {pool.tokenB.ticker}</span>
                    </td>
                    <td className="p-3 text-text-secondary">${pool.tvl.toLocaleString()}</td>
                    <td className="p-3 text-text-primary">${pool.volume24h.toLocaleString()}</td>
                    <td className="p-3 text-text-secondary">{pool.feeRate.toFixed(2)}%</td>
                    <td className="p-3 text-accent-gold font-medium">
                      ${pool.routingVolume.toLocaleString()}{' '}
                      <span className="text-[10px] text-text-tertiary select-none">({routedPercent.toFixed(0)}%)</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-[11px] font-sans font-medium text-text-secondary group-hover:text-accent-gold transition-colors">
                        View charts ↗
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pool details detail modal wrapper */}
      {selectedPoolForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#1A1D17]/85 backdrop-blur-sm"
            onClick={() => setSelectedPoolForDetail(null)}
          />

          <div className="relative w-full max-w-[500px] bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-border-default flex justify-between items-center bg-bg-surface">
              <h3 className="font-serif text-lg text-text-primary font-medium flex items-center gap-2">
                <TokenIcon token={selectedPoolForDetail.tokenA} size={18} />
                <TokenIcon token={selectedPoolForDetail.tokenB} size={18} />
                <span>{selectedPoolForDetail.tokenA.ticker} / {selectedPoolForDetail.tokenB.ticker} Pool details</span>
              </h3>
              <button 
                onClick={() => setSelectedPoolForDetail(null)}
                className="text-text-secondary hover:text-text-primary p-1 text-xs font-mono border border-transparent hover:border-border-default rounded-sm"
              >
                [ Close ]
              </button>
            </div>

            <div className="p-5 space-y-4 bg-bg-surface">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-bg-base/40 rounded-lg border border-border-default/40">
                  <span className="font-serif italic text-text-secondary block">Total TVL locked</span>
                  <span className="font-mono text-sm font-semibold text-text-primary block mt-0.5">
                    ${selectedPoolForDetail.tvl.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-bg-base/40 rounded-lg border border-border-default/40">
                  <span className="font-serif italic text-text-secondary block">24h volume size</span>
                  <span className="font-mono text-sm font-semibold text-text-primary block mt-0.5">
                    ${selectedPoolForDetail.volume24h.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-bg-base/40 rounded-lg border border-border-default/40">
                  <span className="font-serif italic text-text-secondary block">LP fee rewards parameter</span>
                  <span className="font-mono text-sm font-semibold text-text-primary block mt-0.5">
                    {selectedPoolForDetail.feeRate.toFixed(2)}%
                  </span>
                </div>
                <div className="p-3 bg-bg-base/40 rounded-lg border border-border-default/40">
                  <span className="font-serif italic text-text-secondary block">NovaDEX Routed total</span>
                  <span className="font-mono text-sm font-semibold text-accent-gold block mt-0.5">
                    ${selectedPoolForDetail.routingVolume.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Price history mock graph */}
              <div>
                <span className="font-serif italic text-xs text-text-secondary block mb-1 px-1">Price trajectory history chart (30d)</span>
                <div className="h-44 bg-bg-base/40 border border-border-default/45 rounded-lg p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { day: '1', price: 0.121 },
                      { day: '6', price: 0.123 },
                      { day: '12', price: 0.120 },
                      { day: '18', price: 0.124 },
                      { day: '24', price: 0.125 },
                      { day: '30', price: 0.128 },
                    ]} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <XAxis dataKey="day" stroke="#3A3D33" tick={{ fill: '#6E6B5F', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                      <YAxis stroke="#3A3D33" type="number" domain={['auto', 'auto']} tick={{ fill: '#6E6B5F', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                      <Line type="monotone" dataKey="price" stroke="#C9A876" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#2E3129] border border-[#3E4334] text-[11px] p-3 text-text-secondary font-sans leading-relaxed rounded-md">
                Liquidity provisioning coordinates directly over Aquarius protocol rules. Yield earnings accumulate directly in respective on-chain liquidity vaults as fee sweeps occurs.
              </div>

              <a
                href="https://aquarius.exchange"
                target="_blank"
                rel="noreferrer noreferrer"
                className="w-full py-2.5 bg-transparent border border-border-default hover:border-border-emphasis text-center hover:text-text-primary rounded-lg text-xs font-sans font-medium hover:bg-bg-base/30 transition-all block"
              >
                Provision active liquidity via Aquarius ↗
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// 8. PAGE 6 — ABOUT EDITORIAL PROSE FAQ VIEW
// ==========================================
function AboutView() {
  const contractList = [
    { name: "Intent Router Core", id: "CC8192...81F1A2", scope: "Testnet" },
    { name: "Slippage Price Oracle", id: "O8DF12A...A1132D", scope: "Testnet" },
    { name: "Direct Pool Executor", id: "D92EF11...EF2A11", scope: "Testnet" },
  ];

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    useToastStore.getState().addToast("Contract ID copied to clipboard", "success");
  };

  const faqItems = [
    {
      id: 'faq-1',
      question: "Is NovaDEX non-custodial?",
      answer: "Absolutely. NovaDEX acts entirely as an stateless intent compiler router. We do not maintain off-chain transaction logs, holding balances, private key deposits, or personal asset records. All routing calculations construct payload signatures executed atomically by the user's Freighter extension directly on the ledger."
    },
    {
      id: 'faq-2',
      question: "Which wallets are supported?",
      answer: "In the V1 release cycle, Freighter wallet is natively supported. Freighter provides high-integrity ledger interaction, Soroban smart payload checks, and fully secure key preservation configurations."
    },
    {
      id: 'faq-3',
      question: "What is Soroban, and how does NovaDEX utilize it?",
      answer: "Soroban is Stellar's state-of-the-art WebAssembly (WASM)-based smart contracts engine. NovaDEX uses specialized compiled Soroban routers to execute split Trades simultaneously across SDEX depth spreads and Aquarius AMMs in a single atomic transaction. Either the entire optimized price rate completes, or the ledger reverts safely without partial losses."
    },
    {
      id: 'faq-4',
      question: "Are there protocol routing commissions?",
      answer: "Our indexing services levy a flat 0.10% commission included directly within output estimations. Swaps routes are aggressively optimized to exceed this boundary such that you achieve significantly improved rates over direct simple asset splits automatically."
    }
  ];

  return (
    <div className="max-w-[680px] mx-auto space-y-8 pb-12">
      
      {/* Header section */}
      <div className="space-y-2 select-none">
        <h1 className="font-serif text-3xl font-medium text-text-primary">About NovaDEX</h1>
        <p className="font-serif italic text-lg text-text-secondary leading-relaxed">
          "Swap any Stellar asset. Get the best price. No thinking required."
        </p>
      </div>

      {/* Narrative Section */}
      <div className="space-y-4 font-sans text-sm text-text-secondary leading-relaxed">
        <p>
          NovaDEX is Stellar's first dedicated intent aggregator. By parsing real-time bids, ask depths, and liquidity distributions across both decentralized order volumes on the Stellar Decentralized Exchange (SDEX) and automated pool variables on Aquarius, the engine maps pathways of maximum asset output.
        </p>
        <p>
          Rather than routing trades simple-mindedly, our split-path calculations dynamically distribute allocation ratios. By split-depositing across order books and AMMs, we reduce trade slippage boundaries significantly—recovering lost value for large and sparse pairs alike.
        </p>
      </div>

      {/* Diagram loop section */}
      <div className="p-5 border border-border-default rounded-xl bg-bg-surface/60">
        <h3 className="font-serif text-base font-semibold text-text-primary mb-3.5 select-none">Intent Routing Pipeline</h3>
        
        {/* SVG graphic loop */}
        <div className="bg-bg-base/70 p-4 border border-border-default/50 rounded-lg flex flex-col items-center gap-1.5 font-mono text-[10px] text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="bg-[#1C2018] px-2 py-1 rounded border border-border-default">Trader Intent Payload</span>
            <span className="text-text-tertiary">---&gt;</span>
            <span className="bg-[#1C2018] px-2 py-1 rounded border border-accent-gold text-accent-gold font-bold">NovaDEX Router Oracle</span>
          </div>

          <div className="text-text-tertiary py-1 text-center font-mono leading-none">
            │<br />
            ▼
          </div>

          <div className="flex border border-border-default/45 p-1 rounded bg-[#2D3126]/20 gap-3">
            <div className="text-[9px] uppercase px-1 py-0.5">SDEX order depth</div>
            <span className="text-text-tertiary font-bold">+</span>
            <div className="text-[9px] uppercase px-1 py-0.5">Aquarius AMM reserves</div>
          </div>

          <div className="text-text-tertiary py-1 text-center font-mono leading-none">
            │<br />
            ▼
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-[#1C2018] px-2 py-1 rounded border border-border-default">Atomic splits compile</span>
            <span className="text-text-tertiary">---&gt;</span>
            <span className="bg-[#21351e] text-success-green px-2 py-1 rounded border border-success-green/20 font-bold">Ledger Execution Complete</span>
          </div>
        </div>
      </div>

      {/* Contract directory section */}
      <div className="space-y-4">
        <h3 className="font-serif text-base font-semibold text-text-primary select-none">Soroban smart contract directory</h3>
        
        <div className="overflow-hidden border border-border-default rounded-lg">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-border-default bg-bg-surface font-serif italic text-text-secondary">
                <th className="p-3">Contract naming</th>
                <th className="p-3">On-chain ID key</th>
                <th className="p-3 text-right">Dev network</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/50 font-mono text-xs">
              {contractList.map((c, i) => (
                <tr key={i} className="hover:bg-bg-surface/30">
                  <td className="p-3 font-sans text-text-primary font-medium">{c.name}</td>
                  <td className="p-3 text-text-secondary flex items-center justify-between gap-2 max-w-[180px]">
                    <span className="truncate">{c.id}</span>
                    <button 
                      onClick={() => handleCopyId(c.id)}
                      className="text-text-tertiary hover:text-accent-gold p-1 cursor-pointer hover:bg-bg-surface rounded transition-all focus:outline-none"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <Badge variant="neutral">{c.scope}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ accordion section */}
      <div className="space-y-4">
        <h3 className="font-serif text-lg font-semibold text-text-primary select-none">Frequently asked queries</h3>
        
        <div className="border-t border-border-default">
          {faqItems.map((item) => (
            <AccordionItem
              key={item.id}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
