'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownUp, Activity, History, BookOpen, Layers, Coins, ExternalLink,
  ChevronRight, TrendingUp, MoveRight, Sliders, Check, Settings, Info,
  Search, Shield, BarChart3, Database, Award, Copy, HelpCircle, FileText,
  Wallet, AlertCircle, CheckCircle, X, ChevronDown, ChevronUp, LogOut,
  ShieldCheck,
} from 'lucide-react';

import { useWalletStore } from '@/store/walletStore';
import { useToastStore } from '@/store/toastStore';
import { useSwapStore } from '@/store/swapStore';
import { Token, Route, SwapRecord, Pool } from '@/types';
import { TOKENS, fetchRoutes } from '@/lib/routing';
import { NovaDexLogo } from '@/components/NovaDexLogo';

// --- Recharts ---
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, LineChart, Line,
} from 'recharts';

// --- Stellar signing ---
import { signTransaction } from '@stellar/freighter-api';
import { fetchBalances, buildSwapTransaction, submitTransaction, buildTrustlineTransaction } from '@/lib/stellar';

// ============================================================
// DESIGN-SYSTEM COMPONENTS
// ============================================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'accent';
  className?: string;
}
function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const styles = {
    neutral: 'bg-gray-100/60 text-slate-500 border border-gray-300/50',
    success: 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20',
    warning: 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20',
    danger:  'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20',
    accent:  'bg-[#818CF8]/10 text-emerald-600 border border-[#818CF8]/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 rounded-full border-2 border-gray-300" />
      <div className="absolute inset-0 rounded-full border-2 border-[#818CF8] border-t-transparent animate-spin" />
    </div>
  );
}

function MetricCard({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="py-6 border-b border-slate-300 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{label}</span>
      <span className="font-bold text-3xl text-slate-900 tracking-tighter mt-1">{value}</span>
      {subValue && <span className="text-xs font-medium text-slate-500">{subValue}</span>}
    </div>
  );
}

function PriceImpactBar({ percent }: { percent: number }) {
  const color = percent < 1 ? '#34D399' : percent <= 3 ? '#FBBF24' : '#F87171';
  const width = Math.min(100, Math.max(0, percent * 20));
  const textColor = percent < 1 ? 'text-[#34D399]' : percent <= 3 ? 'text-[#FBBF24]' : 'text-[#F87171]';

  return (
    <div className="space-y-1.5 py-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-500">Price impact</span>
        <span className={`font-mono font-medium ${textColor}`}>
          {percent === 0 ? '0.00%' : `${percent.toFixed(2)}%`}
        </span>
      </div>
      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percent === 0 ? 0 : Math.max(4, width)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function EmptyState({ title, description, btnLabel, onBtnClick, icon }: {
  title: string; description: string; btnLabel?: string; onBtnClick?: () => void; icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border-y border-slate-200 min-h-[260px]">
      <div className="text-slate-900 mb-6">
        {icon || <AlertCircle className="w-10 h-10" />}
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tighter">{title}</h3>
      <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">{description}</p>
      {btnLabel && onBtnClick && (
        <button
          onClick={onBtnClick}
          className="px-8 py-3 bg-slate-900 text-white rounded-none text-sm font-bold uppercase tracking-widest transition-colors hover:bg-slate-800"
        >
          {btnLabel}
        </button>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string; dark?: boolean }) {
  return (
    <div className="py-8 border-b border-slate-200 group">
      <div className="mb-6 inline-flex text-slate-900 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-slate-900 tracking-tighter">{title}</h3>
      <p className="text-sm font-medium leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 py-4">
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center text-left">
        <span className="text-[15px] font-semibold text-slate-900 hover:text-emerald-600 transition-colors">{question}</span>
        <span className="text-slate-400 ml-4 font-mono text-xs">{open ? '[ - ]' : '[ + ]'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="pt-3 pb-1 text-sm text-slate-500 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// TOKEN COMPONENTS
// ============================================================

const TOKEN_COLORS: Record<string, string> = {
  xlm: '#6366F1', usdc: '#2775CA', aqua: '#00ADEF', yxlm: '#818CF8',
  ars: '#74B9FF', shx: '#A29BFE',
};

function TokenIcon({ token, size = 20 }: { token: Token; size?: number }) {
  const bg = TOKEN_COLORS[token.id] || '#374151';
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-mono font-bold text-white"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.38 }}
    >
      {token.ticker.charAt(0)}
    </div>
  );
}

function TokenSelectModal({ onClose, onSelect, excludeId }: {
  onClose: () => void; onSelect: (t: Token) => void; excludeId?: string;
}) {
  const [query, setQuery] = useState('');
  const filtered = TOKENS.filter(
    (t) => t.id !== excludeId && (
      t.ticker.toLowerCase().includes(query.toLowerCase()) ||
      t.name.toLowerCase().includes(query.toLowerCase())
    )
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[380px] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl z-10">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900">Select Token</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or ticker..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 focus:bg-white transition-colors"
            />
          </div>
        </div>
        <div className="p-2 max-h-[300px] overflow-y-auto">
          {filtered.map((token) => (
            <button
              key={token.id}
              onClick={() => { onSelect(token); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
            >
              <TokenIcon token={token} size={36} />
              <div>
                <div className="font-bold text-slate-900 text-sm tracking-tight">{token.ticker}</div>
                <div className="text-xs font-medium text-slate-500">{token.name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TokenSelector({ token, onSelect }: { token: Token; onSelect: (t: Token) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-xl text-sm font-bold text-slate-900 transition-all"
      >
        <TokenIcon token={token} size={20} />
        <span>{token.ticker}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>
      {open && <TokenSelectModal onClose={() => setOpen(false)} onSelect={onSelect} excludeId={token.id} />}
    </>
  );
}

// ============================================================
// ROUTE COMPONENTS
// ============================================================

function RoutePathPills({ path, size = 'md' }: { path: Token[]; size?: 'sm' | 'md' }) {
  const isSm = size === 'sm';
  return (
    <div className="flex items-center flex-wrap gap-1">
      {path.map((token, i) => (
        <React.Fragment key={`${token.id}-${i}`}>
          <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-gray-300/50 px-2 py-1 rounded-lg">
            <TokenIcon token={token} size={isSm ? 12 : 14} />
            <span className={`font-mono font-semibold ${isSm ? 'text-[10px]' : 'text-xs'} text-slate-900`}>{token.ticker}</span>
          </div>
          {i < path.length - 1 && <ChevronRight className={`text-slate-400 ${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function RouteCard({ route, fromAmount }: { route: Route; fromAmount: string }) {
  const [expanded, setExpanded] = useState(false);
  const dest = route.path[route.path.length - 1];
  return (
    <div className="border border-slate-200/60 bg-white overflow-hidden rounded-2xl relative shadow-sm hover:shadow-md transition-shadow mt-4">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
      <div className="p-5 pl-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-500">Winning route</span>
          <Badge variant="success">Best Price</Badge>
        </div>
        <div className="mb-4"><RoutePathPills path={route.path} /></div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Expected output</span>
            <span className="font-mono text-base font-bold text-slate-900">{route.outputAmount.toFixed(4)}</span>
            <span className="text-xs text-slate-400 block">{dest.ticker}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Route fee</span>
            <span className="font-mono text-base font-bold text-slate-900">{route.feePercent.toFixed(2)}%</span>
            <span className="text-xs text-slate-400 block">Inclusive</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Hops</span>
            <span className="font-mono text-base font-bold text-slate-900 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />{route.hops}
            </span>
            <span className="text-xs text-slate-400 block">{route.hops === 1 ? 'Direct' : `${route.hops} pools`}</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mt-4 pt-3 border-t border-gray-200/60 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3 h-3 text-emerald-600" />
            {expanded ? 'Hide path breakdown' : 'Show path breakdown'}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-4 space-y-2">
                {route.hopsDetails.map((hop, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-gray-300/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="accent" className="text-[9px]">{hop.source}</Badge>
                      <span className="text-xs text-slate-500">{hop.fromToken.ticker} → {hop.toToken.ticker}</span>
                    </div>
                    <span className="font-mono text-xs text-slate-900">{hop.amountOut.toFixed(4)}</span>
                  </div>
                ))}
                <div className="p-2.5 bg-white border border-gray-200 rounded-2xl flex justify-between text-xs">
                  <span className="text-slate-500">Route fingerprint</span>
                  <span className="font-mono text-slate-400 text-[10px]">{route.fingerprint}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AlternativeRoutesList({ routes, selectedRouteId, onSelectRoute }: {
  routes: Route[]; selectedRouteId?: string; onSelectRoute: (r: Route) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!routes || routes.length === 0) return null;
  return (
    <div className="border border-slate-200/60 rounded-2xl bg-white shadow-sm p-4">
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center">
        <span className="text-sm text-slate-500 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          {routes.length} alternative routes
        </span>
        <span className="text-xs text-slate-400">{open ? 'Collapse' : 'Expand'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3 space-y-2">
              {routes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelectRoute(r)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${r.id === selectedRouteId ? 'border-[#818CF8] bg-emerald-50/30' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div><RoutePathPills path={r.path} size="sm" /></div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-semibold text-slate-900 block">{r.outputAmount.toFixed(4)}</span>
                    <span className="font-mono text-[10px] text-[#F87171]">-{r.savingsPercent.toFixed(2)}% vs best</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// WALLET COMPONENTS
// ============================================================

function WalletButton() {
  const { publicKey, xlmBalance, provider, connect, disconnect, toggleNetwork, network, isConnecting } = useWalletStore();
  const { addToast } = useToastStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(publicKey || '');
    addToast('Address copied', 'success');
    setDropdownOpen(false);
  };

  const handleAddTrustlines = async () => {
    if (!publicKey) return;
    setDropdownOpen(false);
    try {
      addToast('Building trustline transaction...', 'info');
      const xdr = await buildTrustlineTransaction(publicKey);
      addToast('Awaiting Freighter signature...', 'warning');
      const { signTransaction } = await import('@stellar/freighter-api');
      const signedResponse = await signTransaction(xdr, { networkPassphrase: 'Test SDF Network ; September 2015' });
      if (signedResponse.error) throw new Error(typeof signedResponse.error === 'string' ? signedResponse.error : JSON.stringify(signedResponse.error));
      addToast('Submitting to Stellar...', 'info');
      const submitResponse = await submitTransaction(signedResponse.signedTxXdr);
      if (submitResponse.successful) {
        addToast('Trustlines added successfully!', 'success');
        fetchBalances(publicKey).then(b => useWalletStore.setState({ balances: b }));
      } else {
        throw new Error('Transaction submission failed');
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Failed to add trustlines: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  if (!publicKey) {
    return (
      <div className="relative">
        <button
          onClick={() => setConnectOpen(!connectOpen)}
          disabled={isConnecting}
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-semibold transition-all disabled:opacity-60"
        >
          {isConnecting ? <Spinner className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
          <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>
        {connectOpen && !isConnecting && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setConnectOpen(false)} />
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-300 rounded-3xl overflow-hidden shadow-lg z-50">
              <div className="p-2 space-y-1">
                <button onClick={() => { setConnectOpen(false); connect('freighter'); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-gray-100 rounded-2xl transition-all">
                  <Wallet className="w-4 h-4 text-emerald-600" /><span className="font-semibold">Freighter</span>
                </button>
                <button onClick={() => { setConnectOpen(false); connect('albedo'); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-gray-100 rounded-2xl transition-all">
                  <Shield className="w-4 h-4 text-[#2DD4BF]" /><span className="font-semibold">Albedo</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  const short = `${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`;

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl pl-3 pr-2 py-1.5">
        <div className="flex flex-col items-end pr-2 border-r border-gray-300/60">
          <span className="font-mono text-xs font-bold text-slate-900">{xlmBalance.toFixed(2)}</span>
          <span className="text-[10px] text-slate-400">XLM</span>
        </div>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 pl-1.5 text-xs font-mono text-slate-900 hover:text-emerald-600"
        >
          <span>{short}</span>
          <span className="text-[10px] text-slate-400">▼</span>
        </button>
      </div>
      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-300 rounded-3xl overflow-hidden shadow-lg z-50">
            <div className="p-3 border-b border-gray-200 flex justify-between">
              <span className="text-xs text-slate-500">{provider} Connected</span>
              <Badge variant={network === 'mainnet' ? 'warning' : 'neutral'} className="text-[9px]">{network}</Badge>
            </div>
            <div className="p-1.5 space-y-0.5">
              <button onClick={handleCopy} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-900 hover:bg-gray-100 rounded-2xl">
                <Copy className="w-3.5 h-3.5" /><span>Copy address</span>
              </button>
              <a href={`https://stellar.expert/explorer/${network}/account/${publicKey}`} target="_blank" rel="noreferrer" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-900 hover:bg-gray-100 rounded-2xl">
                <ExternalLink className="w-3.5 h-3.5" /><span>Stellar Expert ↗</span>
              </a>
              <button onClick={handleAddTrustlines} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-2xl">
                <ShieldCheck className="w-3.5 h-3.5" /><span>Add Testnet Trustlines</span>
              </button>
              <button onClick={toggleNetwork} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-900 hover:bg-gray-100 rounded-2xl">
                <ShieldCheck className="w-3.5 h-3.5" /><span>Toggle Network</span>
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button onClick={() => { disconnect(); setDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#F87171] hover:bg-[#F87171]/10 rounded-2xl">
                <LogOut className="w-3.5 h-3.5" /><span>Disconnect</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Toast System
function ToastList() {
  const { toasts, removeToast } = useToastStore();
  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4 text-[#34D399]" />,
    error: <AlertCircle className="w-4 h-4 text-[#F87171]" />,
    warning: <AlertCircle className="w-4 h-4 text-[#FBBF24]" />,
    info: <Info className="w-4 h-4 text-emerald-600" />,
  };
  const borders: Record<string, string> = {
    success: 'border-l-[#34D399]',
    error: 'border-l-[#F87171]',
    warning: 'border-l-[#FBBF24]',
    info: 'border-l-[#818CF8]',
  };
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[340px] pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            className={`pointer-events-auto flex items-start gap-2.5 p-3.5 bg-white border border-gray-300 border-l-4 ${borders[t.type]} rounded-2xl shadow-lg`}
          >
            {icons[t.type]}
            <span className="text-xs text-slate-900 font-medium flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Success Card
function SuccessCard({ fromToken, toToken, fromAmount, toAmount, savedAmount, txHash, onReset }: {
  fromToken: Token; toToken: Token; fromAmount: string; toAmount: string;
  savedAmount: number; txHash: string; onReset: () => void;
}) {
  const short = `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}`;
  return (
    <div className="p-8 bg-white border border-slate-200/60 rounded-2xl max-w-[480px] w-full mx-auto text-center shadow-xl shadow-slate-200/50">
      <div className="w-12 h-12 rounded-full bg-[#34D399]/10 border border-[#34D399]/30 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-6 h-6 text-[#34D399]" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 mb-1">Swap Complete</h2>
      <p className="text-xs text-slate-500 mb-6">Transaction confirmed on Stellar ledger via Soroban.</p>
      <div className="bg-slate-50 rounded-2xl p-4 border border-gray-300/40 space-y-3 mb-6 text-left">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Amount paid</span>
          <span className="font-mono font-medium text-slate-900">{parseFloat(fromAmount).toFixed(4)} {fromToken.ticker}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Amount received</span>
          <span className="font-mono font-bold text-[#34D399]">+{parseFloat(toAmount).toFixed(4)} {toToken.ticker}</span>
        </div>
        {savedAmount > 0 && (
          <div className="flex justify-between text-xs pt-2 border-t border-gray-300/30">
            <span className="text-slate-500">NovaDEX savings</span>
            <span className="font-mono font-semibold text-emerald-600">+{savedAmount.toFixed(4)} {toToken.ticker}</span>
          </div>
        )}
        <div className="flex justify-between text-xs pt-2 border-t border-gray-300/30">
          <span className="text-slate-500">Transaction hash</span>
          <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noreferrer" className="font-mono text-emerald-600 hover:underline flex items-center gap-1">
            {short}<ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
      <button onClick={onReset} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-semibold transition-all">
        Make Another Swap
      </button>
    </div>
  );
}

// Confirmation Modal
function ConfirmationModal({ isOpen, onClose, onConfirm, fromToken, toToken, fromAmount, route, slippagePercent }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  fromToken: Token; toToken: Token; fromAmount: string; route: Route | null; slippagePercent: string;
}) {
  const [signing, setSigning] = useState(false);
  if (!isOpen || !route) return null;

  const minReceived = route.outputAmount * (1 - parseFloat(slippagePercent) / 100);

  const handleConfirm = () => {
    setSigning(true);
    setTimeout(() => { setSigning(false); onConfirm(); }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-sm" onClick={() => { if (!signing) onClose(); }} />
      <div className="relative w-full max-w-[440px] bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-2xl z-10">
        <div className="p-4 border-b border-gray-200 flex justify-between">
          <h3 className="text-base font-semibold text-slate-900">Review Swap</h3>
          {!signing && <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><X className="w-4 h-4" /></button>}
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-gray-300/40">
            <div className="flex items-center gap-2">
              <TokenIcon token={fromToken} size={28} />
              <div>
                <span className="font-mono text-xs text-slate-400 block">From</span>
                <span className="font-mono text-sm font-bold text-slate-900">{parseFloat(fromAmount).toFixed(4)} {fromToken.ticker}</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#374151]" />
            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="font-mono text-xs text-slate-400 block">To</span>
                <span className="font-mono text-sm font-bold text-[#34D399]">+{route.outputAmount.toFixed(4)} {toToken.ticker}</span>
              </div>
              <TokenIcon token={toToken} size={28} />
            </div>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Route', value: route.path.map(t => t.ticker).join(' → ') },
              { label: 'Minimum received', value: `${minReceived.toFixed(4)} ${toToken.ticker}` },
              { label: 'Price impact', value: `${route.priceImpactPercent.toFixed(2)}%` },
              { label: 'Slippage tolerance', value: `${slippagePercent}%` },
              { label: 'Protocol fee', value: '0.10% (included)' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-gray-200/50">
                <span className="text-slate-500">{label}</span>
                <span className="font-mono text-slate-900">{value}</span>
              </div>
            ))}
            {route.savedAmount > 0 && (
              <div className="flex justify-between items-center p-2.5 bg-[#34D399]/5 border border-[#34D399]/20 rounded-2xl mt-2">
                <span className="text-[#34D399] flex items-center gap-1"><Info className="w-3 h-3" />NovaDEX savings</span>
                <span className="font-mono font-semibold text-[#34D399]">+{route.savedAmount.toFixed(4)} {toToken.ticker}</span>
              </div>
            )}
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={handleConfirm}
              disabled={signing}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              {signing ? <><Spinner className="w-4 h-4" /><span>Awaiting Freighter...</span></> : <><Wallet className="w-4 h-4" /><span>Confirm Swap</span></>}
            </button>
            {!signing && (
              <button onClick={onClose} className="w-full py-2.5 border border-gray-300 hover:border-emerald-500 text-slate-500 hover:text-slate-900 rounded-2xl text-sm transition-all">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NAVBAR
// ============================================================

function Navbar({ currentPath, onNavigate }: { currentPath: string; onNavigate: (p: string) => void }) {
  const { network } = useWalletStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    { key: 'swap', label: 'Swap' },
    { key: 'history', label: 'History' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'routes', label: 'Routes' },
    { key: 'pools', label: 'Pools' },
    { key: 'about', label: 'About' },
  ];
  return (
    <nav className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-md border-b border-gray-200 h-16 flex items-center">
      <div className="w-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div onClick={() => onNavigate('landing')} className="flex items-center gap-2 cursor-pointer group">
          <NovaDexLogo size={26} className="transition-transform group-hover:scale-110" />
          <span className="text-xl tracking-tighter text-slate-900"><span className="font-black">Nova</span><span className="font-semibold text-emerald-600">DEX</span><span className="text-emerald-500 font-black">.</span></span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-xs uppercase tracking-widest font-bold">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`py-1 transition-colors ${currentPath === item.key ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-900'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <WalletButton />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-900 border border-gray-200 rounded-2xl"
          >
            <span className="font-mono text-xs">{mobileOpen ? '[X]' : '[=]'}</span>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 md:hidden z-30 overflow-hidden"
          >
            <div className="p-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
                  className={`w-full text-left py-2.5 px-3 rounded-2xl text-sm transition-all ${currentPath === item.key ? 'bg-gray-100 text-slate-900 font-semibold' : 'text-slate-500'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// ============================================================
// SWAP PAGE
// ============================================================

function SwapView() {
  const { publicKey, balances, connect } = useWalletStore();
  const { addToast } = useToastStore();
  const {
    fromToken, toToken, fromAmount, toAmount, slippageTolerance, customSlippageValue,
    selectedRoute, alternativeRoutes, isLoadingRoute,
    setFromToken, setToToken, setFromAmount, setSlippageTolerance, swapDirection, selectRoute, reset,
  } = useSwapStore();

  const [slippageOpen, setSlippageOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successPayload, setSuccessPayload] = useState<any>(null);

  const activeSlippage = slippageTolerance === 'custom' ? customSlippageValue : slippageTolerance;

  const handleMaxClick = () => {
    if (!publicKey) return;
    const bal = balances[fromToken.id] || 0;
    if (fromToken.id === 'xlm') {
      const safe = Math.max(0, bal - 1.5);
      setFromAmount(safe.toString());
    } else {
      setFromAmount(bal.toString());
    }
  };

  const handleExecuteSwap = async () => {
    if (!publicKey || !selectedRoute) return;
    if (selectedRoute.id === 'route-empty') {
      addToast('No liquidity path exists for these tokens on testnet.', 'error');
      setConfirmOpen(false);
      return;
    }
    
    setConfirmOpen(false);
    let txHash = null;
    let finalStatus = 'failed';
    try {
      addToast('Building transaction...', 'info');
      const xdr = await buildSwapTransaction(publicKey, selectedRoute, fromAmount, activeSlippage || '0.5');
      addToast('Awaiting Freighter signature...', 'warning');
      const signedResponse = await signTransaction(xdr, { networkPassphrase: 'Test SDF Network ; September 2015' });
      if (signedResponse.error) throw new Error(typeof signedResponse.error === 'string' ? signedResponse.error : JSON.stringify(signedResponse.error));
      addToast('Submitting to Stellar...', 'info');
      const submitResponse = await submitTransaction(signedResponse.signedTxXdr);
      if (submitResponse.successful) {
        txHash = submitResponse.hash;
        finalStatus = 'completed';
        const payload = { fromToken, toToken, fromAmount, toAmount, savedAmount: selectedRoute.savedAmount, txHash: submitResponse.hash };
        setSuccessPayload(payload);
        useWalletStore.getState().refreshBalances();
        addToast('Swap confirmed on ledger!', 'success');
        reset();
      } else {
        throw new Error('Transaction submission failed');
      }
    } catch (err: any) {
      console.error('Swap Error Detailed:', err?.response?.data || err);
      let errorMsg = err.message || 'Unknown error';
      
      // Extract detailed Horizon error codes if available
      if (err.response?.data?.extras?.result_codes) {
         const resultCodes = err.response.data.extras.result_codes;
         const txCode = resultCodes.transaction;
         const opCodes = resultCodes.operations;
         
         if (opCodes && opCodes.length > 0) {
           errorMsg = `Stellar Error: ${opCodes.join(', ')}`;
           if (opCodes.includes('op_no_trust')) {
             errorMsg = `Missing Trustline! You must add a trustline for ${toToken.ticker} in your Freighter wallet before you can receive it.`;
           } else if (opCodes.includes('op_underfunded')) {
             errorMsg = 'Insufficient balance to complete this swap and pay network fees.';
           } else if (opCodes.includes('op_too_few_offers')) {
             errorMsg = 'Not enough liquidity on the network to satisfy this trade.';
           } else if (opCodes.includes('op_cross_self')) {
             errorMsg = 'You cannot swap against your own offers on the network.';
           }
         } else if (txCode) {
           errorMsg = `Transaction Error: ${txCode}`;
         }
      }

      addToast(`Swap failed: ${errorMsg}`, 'error');
    } finally {
      // Record in Supabase
      fetch('/api/swaps/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: publicKey,
          tx_hash: txHash || `failed_${Date.now()}`,
          asset_in_code: fromToken.ticker,
          asset_in_issuer: fromToken.issuer || null,
          asset_out_code: toToken.ticker,
          asset_out_issuer: toToken.issuer || null,
          amount_in: parseFloat(fromAmount),
          amount_out: parseFloat(toAmount),
          savings_usdc: selectedRoute.savedAmount,
          route_fingerprint: selectedRoute.fingerprint,
          route_json: { path: selectedRoute.path.map((t: any) => t.ticker), hops: selectedRoute.hops },
          slippage_tolerance: parseFloat(activeSlippage || '0.5'),
          price_impact: selectedRoute.priceImpactPercent,
          protocol_fee_usdc: selectedRoute.outputAmount * 0.001,
          network: 'testnet',
          status: finalStatus,
        }),
      }).catch(console.warn);
    }
  };

  if (successPayload) {
    return <SuccessCard {...successPayload} onReset={() => setSuccessPayload(null)} />;
  }

  const hasAmount = parseFloat(fromAmount) > 0;

  return (
    <div className="w-full max-w-[480px] mx-auto space-y-8 pt-8">
      {/* Main swap layout */}
      <div>
        <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
          <h2 className="text-3xl font-bold tracking-tighter text-slate-900">Swap</h2>
          {hasAmount && isLoadingRoute && <Spinner className="w-5 h-5 text-slate-900" />}
        </div>
        
        <div className="space-y-8 relative">
          {/* Pay block */}
          <div className="pb-6 border-b border-slate-200 focus-within:border-slate-900 transition-colors group">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 group-focus-within:text-slate-900 transition-colors">You pay</span>
              {publicKey && (
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  Balance: <span className="text-slate-900">{(balances[fromToken.id] || 0).toFixed(2)}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => { const v = e.target.value.replace(',', '.'); if (/^[0-9.]*$/.test(v)) setFromAmount(v); }}
                className="font-bold text-5xl tracking-tighter text-slate-900 bg-transparent outline-none w-full border-none p-0 placeholder:text-slate-200"
              />
              <div className="flex flex-col items-end gap-3 shrink-0">
                <TokenSelector token={fromToken} onSelect={setFromToken} />
                {publicKey && (balances[fromToken.id] || 0) > 0 && (
                  <button onClick={handleMaxClick} className="px-3 py-1 bg-slate-100 text-[10px] font-bold text-slate-900 hover:bg-slate-200 transition-colors uppercase tracking-widest">Max</button>
                )}
              </div>
            </div>
          </div>

          {/* Direction toggle */}
          <div className="absolute top-[138px] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button onClick={swapDirection} className="p-3 bg-white border border-slate-200 hover:border-slate-900 hover:text-slate-900 text-slate-400 transition-all rounded-none">
              <ArrowDownUp className="w-5 h-5" />
            </button>
          </div>

          {/* Receive block */}
          <div className="pb-6 border-b border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">You receive</span>
              {publicKey && <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Balance: <span className="text-slate-900">{(balances[toToken.id] || 0).toFixed(2)}</span></span>}
            </div>
            <div className="flex items-center gap-4">
              {isLoadingRoute ? (
                <div className="h-12 w-48 bg-slate-100 animate-pulse" />
              ) : (
                <span className={`text-5xl tracking-tighter font-bold block w-full ${toAmount ? 'text-slate-900' : 'text-slate-200'}`}>{toAmount || '0.00'}</span>
              )}
              <div className="shrink-0 flex flex-col items-end gap-3">
                <TokenSelector token={toToken} onSelect={setToToken} />
              </div>
            </div>
          </div>

          {/* Savings badge */}
          {selectedRoute && selectedRoute.savedAmount > 0 && (
            <div className="mt-4 p-3 bg-emerald-50 rounded-xl flex items-center justify-between border border-emerald-100/50">
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Best Route Found
              </span>
              <span className="text-xs font-bold text-emerald-700">+{selectedRoute.savedAmount.toFixed(4)} {toToken.ticker}</span>
            </div>
          )}

          {/* Price impact */}
          {selectedRoute && <PriceImpactBar percent={selectedRoute.priceImpactPercent} />}

          {/* Slippage */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs">
              <button onClick={() => setSlippageOpen(!slippageOpen)} className="flex items-center gap-1.5 text-slate-500 font-semibold hover:text-slate-900 transition-colors">
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Slippage tolerance</span>
              </button>
              <span className="font-mono text-slate-500">{activeSlippage}%</span>
            </div>
            <AnimatePresence>
              {slippageOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2">
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-2xl border border-gray-300/40">
                    {['0.1', '0.5', '1.0'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setSlippageTolerance(p)}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-mono text-xs transition-all border ${slippageTolerance === p ? 'bg-emerald-50 border-[#818CF8] text-emerald-600' : 'border-gray-300/40 text-slate-500 hover:text-slate-900'}`}
                      >
                        {p}%
                      </button>
                    ))}
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Custom"
                        value={customSlippageValue}
                        onChange={(e) => { if (/^[0-9.]*$/.test(e.target.value)) setSlippageTolerance('custom', e.target.value); }}
                        className={`w-full py-1.5 pl-2 pr-5 bg-transparent border rounded-lg text-xs font-mono text-slate-900 focus:outline-none ${slippageTolerance === 'custom' ? 'border-[#818CF8]' : 'border-gray-300/40'}`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 px-1">
                    {parseFloat(fromAmount) > 5000 ? 'Recommended: 1.0% for large orders.' : 'Recommended: 0.1%–0.5% for normal trades.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Swap button */}
          <button
            onClick={() => {
              if (!publicKey) { connect('freighter'); return; }
              if (hasAmount && selectedRoute && selectedRoute.id !== 'route-empty') setConfirmOpen(true);
            }}
            disabled={(hasAmount && isLoadingRoute) || (hasAmount && selectedRoute?.id === 'route-empty')}
            className={`w-full py-5 text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 rounded-none mt-8 ${hasAmount && selectedRoute?.id !== 'route-empty' ? 'bg-slate-900 hover:bg-black text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
          >
            {isLoadingRoute ? <><Spinner className="w-4 h-4" /><span>Finding best route...</span></> :
              !publicKey ? 'Connect Wallet' :
              !hasAmount ? 'Enter an amount' :
              selectedRoute?.id === 'route-empty' ? 'No Route Available' : 'Review Swap'}
          </button>
        </div>
      </div>

      {/* Route cards */}
      {selectedRoute && hasAmount && !isLoadingRoute && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <RouteCard route={selectedRoute} fromAmount={fromAmount} />
          <AlternativeRoutesList routes={alternativeRoutes} selectedRouteId={selectedRoute.id} onSelectRoute={selectRoute} />
        </motion.div>
      )}

      {/* Confirmation modal */}
      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleExecuteSwap}
        fromToken={fromToken}
        toToken={toToken}
        fromAmount={fromAmount}
        route={selectedRoute}
        slippagePercent={activeSlippage || '0.5'}
      />
    </div>
  );
}

// ============================================================
// HISTORY VIEW
// ============================================================

function HistoryView() {
  const { publicKey, connect } = useWalletStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!publicKey) return;
    setLoading(true);
    fetch(`/api/users/${publicKey}/history`)
      .then(r => r.json())
      .then(d => { setHistory(d.swaps || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [publicKey]);

  if (!publicKey) {
    return (
      <div className="w-full max-w-md mx-auto pt-12">
        <EmptyState
          title="Connect wallet to view history"
          description="Your swap history is linked to your Freighter wallet address."
          btnLabel="Connect Freighter"
          onBtnClick={() => connect('freighter')}
          icon={<History className="w-8 h-8 text-emerald-600" />}
        />
      </div>
    );
  }

  const filtered = history.filter(s => {
    if (filterStatus !== 'All' && s.status !== filterStatus.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.asset_in_code.toLowerCase().includes(q) || s.asset_out_code.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Your total savings" value={`$${history.reduce((a, s) => a + Number(s.savings_usdc || 0), 0).toFixed(2)}`} subValue="Via NovaDEX routing" />
        <MetricCard label="Total swaps" value={history.length.toString()} subValue="Recorded on-chain" />
        <MetricCard label="Total volume" value={`$${history.reduce((a, s) => a + Number(s.amount_in || 0), 0).toFixed(2)}`} subValue="Cumulative" />
      </div>

      <div className="border border-slate-200">
        <h2 className="text-base font-semibold text-slate-900 border-b border-slate-200 p-4">Swap History</h2>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b border-slate-200">
          <div className="flex items-center gap-6 border-b border-slate-300 pb-2 w-full md:w-auto">
            {['All', 'Completed', 'Reverted'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`py-2 px-1 text-sm font-bold uppercase tracking-widest transition-colors ${filterStatus === s ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-900'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search by asset..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#818CF8]" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="w-6 h-6" /></div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-2xl">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50/80 text-slate-500">
                  {['Date', 'Pair', 'Amount In', 'Amount Out', 'Savings', 'Status', 'Tx Hash'].map(h => (
                    <th key={h} className="p-3 font-medium uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/50 font-mono">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-500">No swaps found</td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-white/50">
                    <td className="p-3 text-slate-500">{new Date(s.executed_at).toLocaleDateString()}</td>
                    <td className="p-3 font-semibold text-slate-900">{s.asset_in_code} / {s.asset_out_code}</td>
                    <td className="p-3">{Number(s.amount_in).toFixed(2)} <span className="text-slate-400 text-[10px]">{s.asset_in_code}</span></td>
                    <td className="p-3 text-[#34D399] font-bold">{Number(s.amount_out).toFixed(4)} <span className="text-[10px] text-slate-400">{s.asset_out_code}</span></td>
                    <td className="p-3 text-emerald-600">{s.savings_usdc > 0 ? `+$${Number(s.savings_usdc).toFixed(4)}` : '--'}</td>
                    <td className="p-3"><Badge variant={s.status === 'completed' ? 'success' : 'danger'}>{s.status}</Badge></td>
                    <td className="p-3">
                      <a href={`https://stellar.expert/explorer/testnet/tx/${s.tx_hash}`} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline flex items-center gap-1">
                        {s.tx_hash.substring(0, 6)}...<ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ANALYTICS VIEW
// ============================================================

function AnalyticsView() {
  const { publicKey } = useWalletStore();
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const volumeData = [
    { date: 'Jun 08', vol: 180200 }, { date: 'Jun 09', vol: 220500 },
    { date: 'Jun 10', vol: 195000 }, { date: 'Jun 11', vol: 245000 },
    { date: 'Jun 12', vol: 310200 }, { date: 'Jun 13', vol: 285400 },
    { date: 'Jun 14', vol: 382400 },
  ];
  const savingsData = [
    { date: 'Jun 08', sav: 3100 }, { date: 'Jun 09', sav: 4200 },
    { date: 'Jun 10', sav: 3800 }, { date: 'Jun 11', sav: 5900 },
    { date: 'Jun 12', sav: 7100 }, { date: 'Jun 13', sav: 6500 },
    { date: 'Jun 14', sav: 9400 },
  ];

  useEffect(() => {
    fetch('/api/analytics/global').then(r => r.json()).then(setGlobalStats).catch(() => {});
    if (publicKey) {
      fetch(`/api/users/${publicKey}/analytics`).then(r => r.json()).then(d => setAnalytics(d)).catch(() => {});
    }
  }, [publicKey]);

  const tooltipStyle = { backgroundColor: '#111827', borderColor: '#374151', color: '#F9FAFB' };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900 border-b border-gray-200 pb-3">Platform Analytics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total swap volume" value={globalStats ? `$${Number(globalStats.total_volume_usdc).toLocaleString()}` : '$14.2M'} subValue="All networks" />
        <MetricCard label="Total swaps" value={globalStats ? Number(globalStats.total_swaps).toLocaleString() : '284,105'} subValue="Completed" />
        <MetricCard label="Total savings" value={globalStats ? `$${Number(globalStats.total_savings_usdc).toLocaleString()}` : '$312,056'} subValue="Returned to traders" />
        <MetricCard label="Unique wallets" value={globalStats ? Number(globalStats.unique_wallets).toLocaleString() : '18,451'} subValue="Active traders" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 bg-white border border-gray-200 rounded-3xl">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Weekly Volume (USD)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818CF8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#818CF8" stopOpacity={0.005} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#1F2937" tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis stroke="#1F2937" tickFormatter={v => `$${v / 1000}k`} tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="vol" stroke="#818CF8" strokeWidth={1.5} fillOpacity={1} fill="url(#colorVol)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-3xl">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Weekly Savings (USD)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#1F2937" tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis stroke="#1F2937" tickFormatter={v => `$${v / 1000}k`} tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="sav" fill="#34D399" radius={[2, 2, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Personal analytics */}
      {publicKey && analytics && (
        <div className="p-5 bg-white border border-gray-200 rounded-3xl">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Your Personal Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Your total savings" value={`$${Number(analytics.totalSavings).toFixed(2)}`} subValue="Via NovaDEX routing" />
            <MetricCard label="Your total volume" value={`$${Number(analytics.totalVolume).toFixed(2)}`} subValue="Cumulative" />
            <MetricCard label="Avg slippage used" value={`${analytics.avgSlippage}%`} subValue="Per swap" />
          </div>
          {analytics.mostUsedPairs.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Most Used Pairs</h4>
              <div className="space-y-2">
                {analytics.mostUsedPairs.map(({ pair, volume }: any, i: number) => {
                  const maxVol = analytics.mostUsedPairs[0].volume;
                  return (
                    <div key={pair} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono text-slate-500">
                        <span>{pair}</span><span>${Number(volume).toFixed(2)}</span>
                      </div>
                      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#818CF8] rounded-full" style={{ width: `${(volume / maxVol) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ROUTE EXPLORER VIEW
// ============================================================

function RouteExplorerView() {
  const [assetA, setAssetA] = useState<Token>(TOKENS[0]);
  const [assetB, setAssetB] = useState<Token>(TOKENS[1]);
  const [amount, setAmount] = useState('1500');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [searching, setSearching] = useState(false);
  const [slider, setSlider] = useState(50);
  // fetchRoutes imported at module level from @/lib/routing

  const run = useCallback(async () => {
    const val = parseFloat(amount);
    if (!val) return;
    setSearching(true);
    try {
      const { winningRoute, alternativeRoutes } = await fetchRoutes(assetA, assetB, val);
      setRoutes([winningRoute, ...alternativeRoutes]);
    } finally {
      setSearching(false);
    }
  }, [amount, assetA, assetB]);

  useEffect(() => { run(); }, [run]);

  const handleSlider = (v: number) => {
    setSlider(v);
    const computed = Math.round(Math.pow(10, 1 + v / 25));
    setAmount(computed.toString());
  };

  const getImpactColor = (v: number) => v < 1 ? 'text-[#34D399]' : v <= 3 ? 'text-[#FBBF24]' : 'text-[#F87171]';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="p-5 bg-white border border-gray-200 rounded-3xl">
        <h2 className="text-base font-semibold text-slate-900 border-b border-gray-200 pb-3.5 mb-5 flex justify-between">
          <span>Route Explorer</span>
          {searching && <Spinner className="w-4 h-4" />}
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 grow w-full">
            <div className="flex-1">
              <span className="text-xs text-slate-500 block mb-1">Source</span>
              <TokenSelector token={assetA} onSelect={setAssetA} />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 mt-5" />
            <div className="flex-1">
              <span className="text-xs text-slate-500 block mb-1">Destination</span>
              <TokenSelector token={assetB} onSelect={setAssetB} />
            </div>
          </div>
          <div className="w-full sm:w-44">
            <span className="text-xs text-slate-500 block mb-1">Amount</span>
            <input type="text" value={amount} onChange={e => { if (/^[0-9.]*$/.test(e.target.value)) setAmount(e.target.value); }} className="w-full py-2 px-3 bg-slate-50 border border-gray-300 focus:border-[#818CF8] rounded-2xl font-mono text-sm text-slate-900 focus:outline-none" />
          </div>
          <button onClick={run} className="w-full sm:w-auto px-5 py-2 mt-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-2xl transition-all">
            Find Routes
          </button>
        </div>
      </div>

      <div className="p-5 bg-white border border-gray-200 rounded-3xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Route Comparison</h3>
          <Badge variant="neutral">Sorted by output</Badge>
        </div>
        <div className="overflow-x-auto border border-gray-200 rounded-2xl">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50/70 text-slate-500">
                {['Path', 'Sources', 'Output', 'Fee', 'Impact', 'Status'].map(h => (
                  <th key={h} className="p-3 font-medium uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]/50 font-mono">
              {routes.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-500">Enter params to explore routes</td></tr>
              ) : routes.map((r, i) => (
                <tr key={r.id} className={`hover:bg-slate-50/30 ${i === 0 ? 'bg-emerald-50/20' : ''}`}>
                  <td className="p-3"><RoutePathPills path={r.path} size="sm" /></td>
                  <td className="p-3 text-slate-500 font-sans">{r.hopsDetails.map(h => h.source).join(' + ') || 'SDEX'}</td>
                  <td className="p-3 font-bold text-slate-900">{r.outputAmount.toFixed(4)} <span className="text-[10px] text-slate-400">{r.path[r.path.length - 1]?.ticker}</span></td>
                  <td className="p-3 text-slate-500">{r.feePercent.toFixed(2)}%</td>
                  <td className={`p-3 font-bold ${getImpactColor(r.priceImpactPercent)}`}>{r.priceImpactPercent.toFixed(2)}%</td>
                  <td className="p-3">{i === 0 ? <Badge variant="success">Optimal</Badge> : <span className="text-[10px] text-slate-400">Backup</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slider */}
      <div className="p-5 bg-white border border-gray-200 rounded-3xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Order Size Simulator</h3>
            <p className="text-xs text-slate-500">Drag to see how routes change with order size</p>
          </div>
          <span className="font-mono text-sm font-bold text-emerald-600 border border-gray-300/60 px-3 py-1 bg-slate-50 rounded-2xl">
            {parseInt(amount).toLocaleString()} {assetA.ticker}
          </span>
        </div>
        <input type="range" min={5} max={99} value={slider} onChange={e => handleSlider(parseInt(e.target.value))} className="w-full cursor-pointer" />
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>Min (10)</span><span>Split crossover (~12,500)</span><span>Max (100k)</span>
        </div>
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-gray-300/45 flex items-center gap-2 text-xs">
          <Info className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-slate-500">At larger sizes, NovaDEX splits orders across SDEX and Aquarius to minimize slippage. Watch the route change above.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// POOLS VIEW
// ============================================================

const MOCK_POOLS: Pool[] = [
  { id: 'xlm-usdc', tokenA: TOKENS[0], tokenB: TOKENS[1], tvl: 4500000, volume24h: 382400, feeRate: 0.3, routingVolume: 215300 },
  { id: 'xlm-aqua', tokenA: TOKENS[0], tokenB: TOKENS[2], tvl: 1850000, volume24h: 195200, feeRate: 0.3, routingVolume: 125800 },
];

function PoolsView() {
  const [selected, setSelected] = useState<Pool | null>(null);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Liquidity Pools</h1>
          <p className="text-xs text-slate-500 mt-0.5">Aquarius AMM pools routed through by NovaDEX</p>
        </div>
        <Badge variant="neutral">Refreshed 60s</Badge>
      </div>
      <div className="p-5 bg-white border border-gray-200 rounded-3xl">
        <div className="overflow-x-auto border border-gray-200 rounded-2xl">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50/70 text-slate-500">
                {['Pool', 'TVL', '24h Volume', 'Fee', 'NovaDEX Routed', ''].map(h => (
                  <th key={h} className="p-3 font-medium uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]/50 font-mono">
              {MOCK_POOLS.map(pool => (
                <tr key={pool.id} onClick={() => setSelected(pool)} className="hover:bg-slate-50/40 cursor-pointer group transition-colors">
                  <td className="p-3 font-semibold text-slate-900 flex items-center gap-2 pt-4">
                    <TokenIcon token={pool.tokenA} size={18} />
                    <TokenIcon token={pool.tokenB} size={18} />
                    <span className="group-hover:text-emerald-600 transition-colors">{pool.tokenA.ticker} / {pool.tokenB.ticker}</span>
                  </td>
                  <td className="p-3 text-slate-500">${pool.tvl.toLocaleString()}</td>
                  <td className="p-3 text-slate-900">${pool.volume24h.toLocaleString()}</td>
                  <td className="p-3 text-slate-500">{pool.feeRate.toFixed(2)}%</td>
                  <td className="p-3 text-emerald-600 font-medium">${pool.routingVolume.toLocaleString()} <span className="text-[10px] text-slate-400">({((pool.routingVolume/pool.volume24h)*100).toFixed(0)}%)</span></td>
                  <td className="p-3 text-right"><span className="text-[11px] text-slate-500 group-hover:text-emerald-600">View ↗</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-[500px] bg-white border border-gray-300 rounded-3xl overflow-hidden shadow-lg z-10">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <TokenIcon token={selected.tokenA} size={18} />
                <TokenIcon token={selected.tokenB} size={18} />
                {selected.tokenA.ticker} / {selected.tokenB.ticker}
              </h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-900 font-mono text-xs border border-gray-300 px-2 py-1 rounded-lg">[ Close ]</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                {[
                  { label: 'TVL', value: `$${selected.tvl.toLocaleString()}` },
                  { label: '24h Volume', value: `$${selected.volume24h.toLocaleString()}` },
                  { label: 'LP Fee', value: `${selected.feeRate.toFixed(2)}%` },
                  { label: 'NovaDEX Routed', value: `$${selected.routingVolume.toLocaleString()}` },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-slate-50 rounded-2xl border border-gray-300/40">
                    <span className="text-slate-500 block">{label}</span>
                    <span className="font-mono text-sm font-bold text-slate-900 mt-0.5 block">{value}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-slate-50 border border-gray-300/40 rounded-2xl text-xs text-slate-500">
                Liquidity provisioning is managed via the Aquarius protocol. NovaDEX does not manage LP positions in v1.
              </div>
              <a href="https://aquarius.exchange" target="_blank" rel="noreferrer" className="w-full py-2.5 border border-gray-300 hover:border-emerald-500 text-slate-500 hover:text-slate-900 rounded-2xl text-sm font-medium text-center transition-all block">
                Add Liquidity on Aquarius ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ABOUT VIEW
// ============================================================

function AboutView() {
  const contracts = [
    { name: 'Aggregator Router', id: process.env.NEXT_PUBLIC_AGGREGATOR_CONTRACT_ID || 'deploy-then-update-env', scope: 'Testnet' },
    { name: 'Price Oracle', id: process.env.NEXT_PUBLIC_ORACLE_CONTRACT_ID || 'deploy-then-update-env', scope: 'Testnet' },
  ];

  const { addToast } = useToastStore();

  const faqs = [
    { q: 'Is NovaDEX non-custodial?', a: 'Yes. NovaDEX never holds your assets. All swaps execute directly on-chain via your Freighter wallet. We do not store private keys, seed phrases, or sign transactions on your behalf.' },
    { q: 'Which wallets are supported?', a: 'Freighter wallet is natively supported in v1. Albedo is also supported as a secondary option. Freighter is recommended for the full Soroban experience.' },
    { q: 'What is Soroban and how does NovaDEX use it?', a: 'Soroban is Stellar\'s WebAssembly smart contract platform. NovaDEX uses two Soroban contracts: the Aggregator Router executes swaps atomically, and the Price Oracle records on-chain savings proofs.' },
    { q: 'What is the protocol fee?', a: 'NovaDEX charges a flat 0.10% (10 basis points) protocol fee on each swap. This is included in all route output estimates shown in the UI. The fee is collected by the Aggregator Router contract.' },
    { q: 'Does NovaDEX store my swap history?', a: 'Yes - swap records are stored in Supabase under your Stellar public key. No personal data is collected. Your wallet address is your only identifier. You can view your history on the History page.' },
  ];

  return (
    <div className="max-w-[680px] mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">About NovaDEX</h1>
        <p className="text-base text-slate-500 mt-2 italic">&quot;Swap any Stellar asset. Get the best price. No thinking required.&quot;</p>
      </div>

      <div className="space-y-4 text-sm text-slate-500 leading-relaxed">
        <p>NovaDEX is Stellar&apos;s first intent-based DEX aggregator. It simultaneously fetches live price data from SDEX order books, Aquarius AMM pools, and anchor exchange rates, then finds the optimal route - including multi-hop paths and order splits for large trades.</p>
        <p>The Aggregator Router Soroban contract executes swaps atomically. Either the full swap completes at the quoted price within your slippage tolerance, or the entire transaction reverts. No partial fills. No unexpected outcomes.</p>
      </div>

      {/* Architecture diagram */}
      <div className="p-5 border border-gray-200 rounded-3xl bg-white/60">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Intent Routing Pipeline</h3>
        <div className="bg-slate-50 p-4 border border-gray-200/50 rounded-2xl flex flex-col items-center gap-2 font-mono text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="bg-slate-50 px-2 py-1 rounded border border-gray-300">Trader Intent</span>
            <span className="text-slate-400">---&gt;</span>
            <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-[#818CF8] font-bold">NovaDEX Router</span>
          </div>
          <div className="text-[#374151] py-1">│ ▼</div>
          <div className="flex border border-gray-300/45 p-1 rounded gap-3">
            <span className="px-1 py-0.5 text-[9px] uppercase">SDEX order depth</span>
            <span className="text-slate-400 font-bold">+</span>
            <span className="px-1 py-0.5 text-[9px] uppercase">Aquarius AMM pools</span>
          </div>
          <div className="text-[#374151] py-1">│ ▼</div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-50 px-2 py-1 rounded border border-gray-300">Atomic split compiles</span>
            <span className="text-slate-400">---&gt;</span>
            <span className="bg-[#0D2318] text-[#34D399] px-2 py-1 rounded border border-[#34D399]/20 font-bold">Ledger Confirmed ✓</span>
          </div>
        </div>
      </div>

      {/* Contract directory */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900">Soroban Contract Directory</h3>
        <div className="overflow-hidden border border-gray-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-white text-slate-500">
                <th className="p-3 font-medium uppercase tracking-wider text-[10px]">Contract</th>
                <th className="p-3 font-medium uppercase tracking-wider text-[10px]">ID</th>
                <th className="p-3 text-right font-medium uppercase tracking-wider text-[10px]">Network</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]/50 font-mono">
              {contracts.map((c, i) => (
                <tr key={i} className="hover:bg-white/50">
                  <td className="p-3 text-slate-900 font-sans font-medium">{c.name}</td>
                  <td className="p-3 text-slate-500 flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{c.id}</span>
                    <button onClick={() => { navigator.clipboard.writeText(c.id); addToast('Copied!', 'success'); }} className="text-slate-400 hover:text-emerald-600 p-1">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  <td className="p-3 text-right"><Badge variant="neutral">{c.scope}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Frequently Asked Questions</h3>
        <div className="border-t border-gray-200">
          {faqs.map((item, i) => <AccordionItem key={i} question={item.q} answer={item.a} />)}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-900 transition-colors">GitHub ↗</a>
        <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-900 transition-colors">Twitter ↗</a>
      </div>
    </div>
  );
}

// ============================================================
// LANDING PAGE
// ============================================================

function LandingPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 overflow-hidden">
      {/* Landing nav */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white border-b border-slate-200 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NovaDexLogo size={32} className="transition-transform hover:scale-110" />
            <span className="text-2xl tracking-tighter text-slate-900"><span className="font-black">Nova</span><span className="font-semibold text-emerald-600">DEX</span><span className="text-emerald-500 font-black">.</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-10 text-xs uppercase tracking-widest font-bold text-slate-400">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#about" className="hover:text-slate-900 transition-colors">Infrastructure</a>
          </nav>
          <button onClick={() => onNavigate('swap')} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-none text-xs uppercase tracking-widest font-bold transition-all">
            Launch App
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pt-32 pb-24 md:pt-48 md:pb-32 flex flex-col md:flex-row items-center gap-12">
        {/* Left Content */}
        <div className="flex-1 text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Stellar's first intent-based DEX
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter text-slate-900 leading-[1.1] mb-6">
            Swap any asset.<br />
            <span className="text-emerald-600">Get the best price.</span>
          </h1>
          <p className="text-base md:text-lg text-slate-500 max-w-lg leading-relaxed mb-10 font-medium">
            NovaDEX aggregates liquidity from SDEX, Aquarius, and anchors, routing your trade through the most efficient path automatically.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button onClick={() => onNavigate('swap')} className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-none text-sm uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2">
              Start Swapping <ChevronRight className="w-4 h-4" />
            </button>
            <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 bg-transparent border border-slate-900 hover:bg-slate-50 text-slate-900 rounded-none text-sm uppercase tracking-widest font-bold transition-all text-center">
              Learn More
            </a>
          </div>
        </div>

        {/* Right Mockup */}
        <div className="flex-1 relative w-full max-w-lg hidden md:block">
          {/* Decorative background blobs */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-200/50 rounded-full blur-3xl mix-blend-multiply" />
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-200/50 rounded-full blur-3xl mix-blend-multiply" />
          
          {/* Abstract Typography Graphic */}
          <div className="relative pl-12 border-l-8 border-slate-900 pt-8">
            <div className="space-y-12">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-2">Intent</span>
                <div className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tighter">
                  SELL 1,000 <span className="text-slate-300">XLM</span>
                </div>
              </div>
              <div className="text-slate-300">
                <ArrowDownUp className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-2">Outcome</span>
                <div className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tighter">
                  BUY 141.25 <span className="text-emerald-600">USDC</span>
                </div>
              </div>
              <div className="pt-8 border-t border-slate-200">
                <span className="text-sm font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" /> +3.84 USDC Saved
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem strip */}
      <section className="w-full bg-white py-24 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-slate-900 mb-4">Stellar DeFi has a fragmentation problem</h2>
            <p className="text-slate-500 font-medium">Liquidity is scattered across multiple protocols, making it difficult for traders to execute efficiently.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { n: '01', t: 'Scattered Liquidity', d: 'Liquidity is spread across SDEX order books, Aquarius AMM pools, and anchor rates with no unified entry point.' },
              { n: '02', t: 'Manual Trade Parsing', d: 'Traders must manually check bid/ask depth across multiple sources, compute split ratios, and execute separately.' },
              { n: '03', t: 'Value Left Behind', d: 'Direct single-source swaps suffer significant price slippage. Over 40% of Stellar swaps leave money on the table.' },
            ].map(({ n, t, d }) => (
              <div key={n} className="py-8 border-t border-slate-200">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white font-black text-sm mb-4">{n}</span>
                <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tighter">{t}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="w-full max-w-7xl mx-auto px-6 py-24 text-center">
        <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-slate-900 mb-4">Atomic routing sequence</h2>
        <p className="text-slate-500 font-medium max-w-xl mx-auto mb-16">NovaDEX executes intents atomically through Soroban smart contracts. Either the full trade completes at the quoted price, or it reverts entirely.</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          {[
            { phase: 'Phase 1', label: 'Trade Intent', desc: 'Enter target assets and amount.', variant: 'accent' as const },
            null,
            { phase: 'Phase 2', label: 'Multi-Source Sweep', desc: 'Parallel fetch from SDEX, Aquarius, and anchors.', variant: 'neutral' as const },
            null,
            { phase: 'Phase 3', label: 'Atomic Execution', desc: 'Soroban compiles optimal path into a single ledger event.', variant: 'success' as const },
          ].map((item, i) => {
            if (!item) return <div key={i} className="flex justify-center items-center py-4"><span className="text-slate-300 rotate-90 md:rotate-0"><MoveRight className="w-8 h-8" /></span></div>;
            return (
              <div key={i} className="py-8 border-b border-slate-200 text-left h-full flex flex-col justify-center">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3">{item.phase}</span>
                <h4 className="text-xl font-bold text-slate-900 mb-2 tracking-tighter">{item.label}</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="w-full bg-slate-900 py-24 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-white mb-4">Engineered for trade excellence</h2>
            <p className="text-slate-400 font-medium">8 unique features that go beyond basic aggregation.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard icon={<Award className="w-5 h-5" />} title="Savings proof on-chain" description="Every routed swap records an immutable savings proof. Not just a UI display - cryptographically verifiable on-chain." dark />
            <FeatureCard icon={<Shield className="w-5 h-5" />} title="Wallet-native identity" description="No registration. No email. Your Freighter public key is your identity across the entire app." dark />
            <FeatureCard icon={<Sliders className="w-5 h-5" />} title="Smart slippage engine" description="Adaptive slippage tolerance calculated from order book depth. Prevents failed transactions and unnecessary value loss." dark />
            <FeatureCard icon={<Layers className="w-5 h-5" />} title="Route fingerprinting" description="Every swap path gets a unique fingerprint - a hash of hops, sources, and prices. Full audit trail." dark />
            <FeatureCard icon={<TrendingUp className="w-5 h-5" />} title="Price impact simulation" description="Before executing, NovaDEX shows exactly how your trade moves the market. Red >3%, yellow 1-3%, green below 1%." dark />
            <FeatureCard icon={<BarChart3 className="w-5 h-5" />} title="Personal analytics" description="Total volume, savings, favourite pairs, average slippage - all private, all yours, all under your wallet key." dark />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="w-full bg-white py-24 text-center border-t border-slate-100">
        <h2 className="text-3xl font-display font-black tracking-tight text-slate-900 mb-4">Start swapping smarter</h2>
        <p className="text-base text-slate-500 font-medium max-w-md mx-auto mb-10">Connect your Freighter wallet and discover optimized routes in seconds.</p>
        <button onClick={() => onNavigate('swap')} className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-none text-sm uppercase tracking-widest font-bold transition-all shadow-xl shadow-slate-900/10">Launch App</button>
      </section>

      <footer className="py-8 border-t border-slate-100 bg-white text-center text-xs font-semibold tracking-wide text-slate-400">
        <p>NovaDEX - Stellar Intent Aggregator Router - Powered by Soroban & Freighter</p>
        <p className="mt-2 text-slate-300">Built for Stellar Hackathon 2026</p>
      </footer>
    </div>
  );
}

// ============================================================
// MAIN APP SHELL
// ============================================================

export default function NovaDEXApp() {
  const [currentPath, setCurrentPath] = useState('landing');
  const { publicKey, balances } = useWalletStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/app')) {
        const sub = hash.replace('#/app', '');
        const map: Record<string, string> = {
          '/history': 'history', '/analytics': 'analytics',
          '/routes': 'routes', '/pools': 'pools', '/about': 'about',
        };
        setCurrentPath(map[sub] || 'swap');
      } else {
        setCurrentPath('landing');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (path: string) => {
    if (path === 'landing') window.location.hash = '';
    else if (path === 'swap') window.location.hash = '#/app';
    else window.location.hash = `#/app/${path}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 selection:bg-[#818CF8]/30">
      <ToastList />

      {/* No-XLM banner */}
      {currentPath !== 'landing' && publicKey && (balances['xlm'] || 0) === 0 && (
        <div className="bg-white border-b border-[#FBBF24]/20 px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#FBBF24] animate-pulse" />
            <p className="text-xs text-slate-500">
              Your wallet has <span className="font-bold text-[#FBBF24]">0 XLM</span>. You need at least 1 XLM to pay network fees.
            </p>
          </div>
          <button
            onClick={async () => {
              addToast('Requesting testnet XLM from Friendbot...', 'info');
              try {
                const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
                if (res.ok) {
                  addToast('Friendbot funded your account with 10,000 testnet XLM!', 'success');
                  useWalletStore.getState().refreshBalances();
                } else {
                  addToast('Friendbot funding failed. Account may already be funded.', 'error');
                }
              } catch {
                addToast('Friendbot request failed.', 'error');
              }
            }}
            className="text-xs font-medium text-[#FBBF24] hover:underline flex items-center gap-1"
          >
            Get Testnet XLM ↗
          </button>
        </div>
      )}

      {currentPath === 'landing' ? (
        <LandingPage onNavigate={navigateTo} />
      ) : (
        <div className="flex flex-col min-h-screen">
          <Navbar currentPath={currentPath} onNavigate={navigateTo} />
          <main className="flex-grow bg-slate-50">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPath}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="max-w-5xl w-full mx-auto px-4 py-8 md:py-12"
              >
                {currentPath === 'swap' && <SwapView />}
                {currentPath === 'history' && <HistoryView />}
                {currentPath === 'analytics' && <AnalyticsView />}
                {currentPath === 'routes' && <RouteExplorerView />}
                {currentPath === 'pools' && <PoolsView />}
                {currentPath === 'about' && <AboutView />}
              </motion.div>
            </AnimatePresence>
          </main>
          <footer className="h-14 bg-slate-50 border-t border-gray-200 flex items-center">
            <div className="w-full max-w-7xl mx-auto px-4 flex justify-between items-center text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <NovaDexLogo size={16} />
                <span>NovaDEX</span>
                <span>-</span>
                <Badge variant="neutral" className="text-[8px]">{useWalletStore.getState().network || 'disconnected'}</Badge>
              </div>
              <div className="flex items-center gap-4">
                <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-500">GitHub</a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-slate-500">Twitter</a>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
