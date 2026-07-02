'use client';

import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownUp, Activity, History, BookOpen, Layers, Coins, ExternalLink,
  ChevronRight, TrendingUp, MoveRight, Sliders, Check, Settings, Info,
  Search, Shield, BarChart3, Database, Award, Copy, HelpCircle, FileText,
  Wallet, AlertCircle, CheckCircle, X, ChevronDown, ChevronUp, LogOut,
  ShieldCheck, ArrowRight,
} from 'lucide-react';

import { useWalletStore } from '@/store/walletStore';
import { useToastStore } from '@/store/toastStore';
import { useSwapStore } from '@/store/swapStore';
import { useDataStore } from '@/store/dataStore';
import { Token, Route, SwapRecord, Pool, RouteSourceGroup } from '@/types';
import { TOKENS, fetchRoutes } from '@/lib/routing';
import { formatTotalVolume, formatUsd } from '@/lib/volume';
import { computeSavingsUsdc, formatSavingsCell, formatSavingsUsd, formatSavingsToken, savingsForRoute, effectiveSavingsUsdc } from '@/lib/savings';
import { NovaDexLogo } from '@/components/NovaDexLogo';
import { GITHUB_URL, TWITTER_URL } from '@/lib/site';

// --- Recharts ---
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, LineChart, Line,
} from 'recharts';

// --- Stellar signing ---
import { signTransaction } from '@stellar/freighter-api';
import { fetchBalances, buildSwapTransaction, submitTransaction, buildTrustlineTransaction } from '@/lib/stellar';

// ============================================================
// CARD NAVIGATION
// ============================================================

type AppPath = 'landing' | 'swap' | 'history' | 'analytics' | 'routes' | 'pools' | 'about';

const CardNavContext = createContext<((path: AppPath) => void) | null>(null);

function useCardNavigate() {
  return useContext(CardNavContext);
}

function resolveFooterNav(footerLabel: string, footerTo?: AppPath): AppPath | undefined {
  if (footerTo) return footerTo;
  const map: Record<string, AppPath> = {
    'Open swap': 'swap',
    'Explore': 'about',
    'Learn more': 'about',
    'Best-price routing': 'routes',
    'Route details': 'routes',
    'Volume trend': 'history',
    'Savings trend': 'swap',
    'Your stats': 'history',
    'Route search': 'swap',
    'Compare routes': 'swap',
    'Simulator': 'routes',
    'Step': 'routes',
    'View analytics': 'analytics',
    'View history': 'history',
    'View pools': 'pools',
    'View swap': 'swap',
  };
  return map[footerLabel];
}

function CardFooterNav({
  label,
  to,
  icon,
}: {
  label: string;
  to?: AppPath;
  icon?: React.ReactNode;
}) {
  const navigate = useCardNavigate();
  const destination = to ?? resolveFooterNav(label);
  const arrow = icon ?? <ArrowRight className="w-4 h-4" />;

  if (!destination || !navigate) {
    return (
      <div className="nd-flat-card-footer">
        <span className="nd-flat-card-footer-text">{label}</span>
        <span className="nd-flat-card-footer-btn">{arrow}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(destination)}
      className="nd-flat-card-footer nd-flat-card-footer--link w-full"
      aria-label={`${label} — go to ${destination}`}
    >
      <span className="nd-flat-card-footer-text">{label}</span>
      <span className="nd-flat-card-footer-btn">{arrow}</span>
    </button>
  );
}

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
    neutral: 'bg-white text-nd-secondary',
    success: 'bg-nd-lime-zone text-nd-ink',
    warning: 'bg-nd-peach-header text-nd-ink',
    danger: 'bg-white text-nd-danger',
    accent: 'bg-nd-lime-zone text-nd-ink',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] border border-nd-card-border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 rounded-full border-2 border-nd-border" />
      <div className="absolute inset-0 rounded-full border-2 border-nd-accent border-t-transparent animate-spin" />
    </div>
  );
}

function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="nd-page-title">{title}</h1>
        {description && <p className="nd-page-desc mt-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type CardVariant = 'mint' | 'blue' | 'peach' | 'lavender' | 'white' | 'deep';

function ServiceCard({
  variant = 'mint',
  eyebrow,
  title,
  description,
  value,
  tags,
  footerLabel = 'Explore',
  icon,
  children,
  onClick,
  className = '',
  footerTo,
}: {
  variant?: CardVariant;
  eyebrow?: string;
  title?: string;
  description?: string;
  value?: string;
  tags?: string[];
  footerLabel?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  footerTo?: AppPath;
}) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`nd-flat-card nd-flat-card--${variant} text-left w-full ${className}`}
    >
      <div className={`nd-flat-card-zone nd-flat-card-zone--${variant}`}>
        {eyebrow && <span className="nd-flat-card-eyebrow">{eyebrow}</span>}
        {icon && <div className="nd-flat-card-icon">{icon}</div>}
        {title && <h3 className="nd-flat-card-title">{title}</h3>}
        {description && <p className="nd-flat-card-desc">{description}</p>}
        {value && <span className="nd-flat-card-value">{value}</span>}
        {tags && tags.length > 0 && (
          <div className="nd-flat-card-tags">
            {tags.map((tag) => (
              <span key={tag} className="nd-flat-card-tag">{tag}</span>
            ))}
          </div>
        )}
        {children}
      </div>
      {footerLabel && footerLabel.length > 0 && (
        <CardFooterNav label={footerLabel} to={footerTo ?? resolveFooterNav(footerLabel)} />
      )}
    </Wrapper>
  );
}

function MetricCard({
  label,
  value,
  subValue,
  variant = 'mint',
  footerLabel = 'View analytics',
  footerTo,
}: {
  label: string;
  value: string;
  subValue?: string;
  variant?: CardVariant;
  footerLabel?: string;
  footerTo?: AppPath;
}) {
  return (
    <ServiceCard
      variant={variant}
      eyebrow={label}
      value={value}
      description={subValue}
      footerLabel={footerLabel}
      footerTo={footerTo}
    />
  );
}

function PanelCard({ title, description, variant = 'mint', children, footerLabel, footerTo, action }: {
  title: string;
  description?: string;
  variant?: CardVariant;
  children: React.ReactNode;
  footerLabel?: string;
  footerTo?: AppPath;
  action?: React.ReactNode;
}) {
  return (
    <div className={`nd-flat-card nd-flat-card--${variant}`}>
      <div className={`nd-flat-card-zone nd-flat-card-zone--${variant}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="nd-flat-card-title !text-lg !mb-1">{title}</h3>
            {description && <p className="nd-flat-card-desc !text-xs">{description}</p>}
          </div>
          {action}
        </div>
      </div>
      <div className="nd-flat-card-content !border-b-0">{children}</div>
      {footerLabel && (
        <CardFooterNav label={footerLabel} to={footerTo ?? resolveFooterNav(footerLabel)} />
      )}
    </div>
  );
}

function PriceImpactBar({ percent }: { percent: number }) {
  const width = Math.min(100, Math.max(0, percent * 20));
  const displayWidth = percent === 0 ? 0 : Math.max(4, width);
  const clipRight = 100 - displayWidth;
  const fillColorClass = percent < 1 ? 'bg-nd-positive' : percent <= 3 ? 'bg-nd-warning' : 'bg-nd-danger';
  const textColor = percent < 1 ? 'text-nd-positive' : percent <= 3 ? 'text-nd-warning' : 'text-nd-danger';

  return (
    <div className="space-y-2 py-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-nd-muted font-medium">Price impact</span>
        <span className={`font-mono font-medium ${textColor}`}>
          {percent === 0 ? '0.00%' : `${percent.toFixed(2)}%`}
        </span>
      </div>
      <div className="h-1.5 w-full bg-nd-raised rounded-full overflow-hidden border border-nd-border/60">
        <div
          className={`h-full w-full rounded-full transition-all duration-300 ${fillColorClass} [clip-path:inset(0_${clipRight}%_0_0)]`}
        />
      </div>
    </div>
  );
}

function EmptyState({ title, description, btnLabel, onBtnClick, icon }: {
  title: string; description: string; btnLabel?: string; onBtnClick?: () => void; icon?: React.ReactNode;
}) {
  return (
    <ServiceCard variant="white" footerLabel="" className="[&_.nd-flat-card-zone]:!border-b-0">
      <div className="flex flex-col items-center justify-center py-10 px-2 text-center min-h-[260px]">
        <div className="nd-flat-card-icon mb-5 mx-auto">
          {icon || <AlertCircle className="w-6 h-6" />}
        </div>
        <h3 className="text-xl font-serif text-nd-ink mb-2">{title}</h3>
        <p className="text-sm text-nd-muted max-w-sm mx-auto mb-8 leading-relaxed">{description}</p>
        {btnLabel && onBtnClick && (
          <button onClick={onBtnClick} className="nd-btn-primary">
            {btnLabel}
          </button>
        )}
      </div>
    </ServiceCard>
  );
}

const FEATURE_VARIANTS: CardVariant[] = ['mint', 'blue', 'lavender', 'peach', 'mint', 'blue'];

function FeatureCard({ icon, title, description, variant = 'mint', tags }: {
  icon: React.ReactNode; title: string; description: string; variant?: CardVariant; tags?: string[];
}) {
  return (
    <ServiceCard
      variant={variant}
      icon={icon}
      title={title}
      description={description}
      tags={tags || ['Routing', 'On-chain']}
      footerLabel="Learn more"
      footerTo="about"
    />
  );
}

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-nd-border py-4">
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center text-left gap-4">
        <span className="text-[15px] font-medium text-nd-ink">{question}</span>
        <ChevronDown className={`w-4 h-4 text-nd-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="pt-3 pb-1 text-sm text-nd-muted leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// TOKEN COMPONENTS
// ============================================================

const TOKEN_BG_CLASSES: Record<string, string> = {
  xlm: 'bg-indigo-500',
  usdc: 'bg-[#2775CA]',
  aqua: 'bg-sky-400',
  yxlm: 'bg-indigo-400',
  ars: 'bg-blue-300',
  shx: 'bg-violet-300',
};

const TOKEN_ICON_SIZE_CLASSES: Record<number, string> = {
  12: 'w-3 h-3 text-[5px]',
  14: 'w-3.5 h-3.5 text-[5px]',
  16: 'w-4 h-4 text-[6px]',
  20: 'w-5 h-5 text-[8px]',
  26: 'w-[26px] h-[26px] text-[10px]',
  28: 'w-7 h-7 text-[11px]',
};

function TokenIcon({ token, size = 20 }: { token: Token; size?: number }) {
  const bgClass = TOKEN_BG_CLASSES[token.id] || 'bg-gray-700';
  const sizeClass = TOKEN_ICON_SIZE_CLASSES[size] || TOKEN_ICON_SIZE_CLASSES[20];
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 font-mono font-bold text-white ${bgClass} ${sizeClass}`}
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
      <div className="absolute inset-0 bg-nd-ink/15 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[380px] nd-card-raised overflow-hidden z-10">
        <div className="p-4 border-b border-nd-border flex justify-between items-center bg-nd-raised/40">
          <h3 className="font-semibold text-nd-ink">Select token</h3>
          <button type="button" onClick={onClose} aria-label="Close token selector" title="Close" className="text-nd-muted hover:text-nd-ink p-1 nd-panel hover:bg-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 border-b border-nd-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nd-muted" />
            <input
              type="text"
              placeholder="Search by name or ticker..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2.5 nd-input-surface text-sm font-medium text-nd-ink placeholder:text-nd-muted focus:outline-none focus:border-nd-accent focus:bg-white transition-colors"
            />
          </div>
        </div>
        <div className="p-2 max-h-[300px] overflow-y-auto">
          {filtered.map((token) => (
            <button
              key={token.id}
              onClick={() => { onSelect(token); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-nd-raised transition-colors text-left"
            >
              <TokenIcon token={token} size={36} />
              <div>
                <div className="font-semibold text-nd-ink text-sm tracking-tight">{token.ticker}</div>
                <div className="text-xs font-medium text-nd-muted">{token.name}</div>
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
        className="flex items-center gap-2 px-3 py-2 bg-white border border-nd-border hover:border-nd-border-strong shadow-nd-sm rounded-lg text-sm font-semibold text-nd-ink transition-all"
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
          <div className="inline-flex items-center gap-1.5 nd-panel px-2 py-1">
            <TokenIcon token={token} size={isSm ? 12 : 14} />
            <span className={`font-mono font-semibold ${isSm ? 'text-[10px]' : 'text-xs'} text-nd-ink`}>{token.ticker}</span>
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
    <div className="nd-flat-card nd-flat-card--mint mt-4">
      <div className="nd-flat-card-zone nd-flat-card-zone--mint">
        <div className="flex items-center justify-between mb-3">
          <span className="nd-flat-card-eyebrow !mb-0">Winning route</span>
          <Badge variant="success">Best price</Badge>
        </div>
        <div className="mb-4"><RoutePathPills path={route.path} /></div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-nd-card-border">
          <div>
            <span className="text-xs text-nd-muted block mb-0.5">Expected output</span>
            <span className="font-mono text-base font-bold text-nd-ink">{route.outputAmount.toFixed(4)}</span>
            <span className="text-xs text-nd-muted block">{dest.ticker}</span>
          </div>
          <div>
            <span className="text-xs text-nd-muted block mb-0.5">Route fee</span>
            <span className="font-mono text-base font-bold text-nd-ink">{route.feePercent.toFixed(2)}%</span>
            <span className="text-xs text-nd-muted block">Inclusive</span>
          </div>
          <div>
            <span className="text-xs text-nd-muted block mb-0.5">Hops</span>
            <span className="font-mono text-base font-bold text-nd-ink flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-nd-accent" />{route.hops}
            </span>
            <span className="text-xs text-nd-muted block">{route.hops === 1 ? 'Direct' : `${route.hops} pools`}</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mt-4 pt-3 border-t border-nd-border text-xs text-nd-muted hover:text-nd-ink transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3 h-3 text-nd-accent" />
            {expanded ? 'Hide path breakdown' : 'Show path breakdown'}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-4 space-y-2">
                {route.hopsDetails.map((hop, i) => (
                  <div key={i} className="p-3 nd-panel flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="accent" className="text-[9px]">{hop.source}</Badge>
                      <span className="text-xs text-nd-muted">{hop.fromToken.ticker} → {hop.toToken.ticker}</span>
                    </div>
                    <span className="font-mono text-xs text-nd-ink">{hop.amountOut.toFixed(4)}</span>
                  </div>
                ))}
                <div className="p-2.5 nd-panel flex justify-between text-xs">
                  <span className="text-nd-muted">Route fingerprint</span>
                  <span className="font-mono text-nd-muted text-[10px]">{route.fingerprint}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <CardFooterNav label="Route details" to="routes" icon={<Layers className="w-4 h-4" />} />
    </div>
  );
}

function SourceGroupedRoutesList({
  sources,
  selectedRouteId,
  onSelectRoute,
  isLoading,
}: {
  sources: RouteSourceGroup[];
  selectedRouteId?: string;
  onSelectRoute: (r: Route) => void;
  isLoading?: boolean;
}) {
  const bestOutput = sources
    .flatMap((s) => s.routes)
    .reduce((max, r) => Math.max(max, r.outputAmount), 0);

  return (
    <div className="nd-flat-card nd-flat-card--white">
      <div className="nd-flat-card-zone nd-flat-card-zone--white !py-3 !border-b">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-nd-ink flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Route sources
          </span>
          <Badge variant="neutral">{isLoading ? 'Searching...' : 'Click to select'}</Badge>
        </div>
      </div>

      {sources.map((group) => (
        <div key={group.type}>
          <div className={`nd-flat-card-zone nd-flat-card-zone--${group.status === 'available' ? 'mint' : 'white'} !py-3 !min-h-0 flex items-center justify-between`}>
            <div>
              <h4 className="text-xs font-semibold text-nd-ink">{group.label}</h4>
              {group.message && (
                <p className={`text-[11px] mt-0.5 ${group.status === 'available' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {group.message}
                </p>
              )}
            </div>
            <Badge variant={group.status === 'available' ? 'success' : 'neutral'}>
              {group.status === 'available' ? `${group.routes.length} route${group.routes.length !== 1 ? 's' : ''}` : 'Unavailable'}
            </Badge>
          </div>

          {group.routes.length > 0 ? (
            <div className="divide-y divide-nd-border">
              {group.routes.map((r) => {
                const isSelected = r.id === selectedRouteId;
                const isBest = r.outputAmount === bestOutput && bestOutput > 0;
                const dest = r.path[r.path.length - 1];
                const sourceLabel = r.hopsDetails.map((h) => h.source).join(' + ');
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectRoute(r)}
                    className={`w-full text-left p-4 transition-all ${
                      isSelected ? 'bg-nd-lime-zone ring-1 ring-inset ring-nd-lime-accent/40' : 'hover:bg-nd-lime-muted/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {isBest && <Badge variant="success">Best price</Badge>}
                          {isSelected && <Badge variant="accent">Selected</Badge>}
                          {r.isSplit && <Badge variant="warning">Split</Badge>}
                        </div>
                        <RoutePathPills path={r.path} size="sm" />
                        <p className="text-[11px] text-nd-muted truncate">{sourceLabel}</p>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <span className="font-mono text-base font-bold text-nd-ink block">
                          {r.outputAmount.toFixed(4)} <span className="text-xs text-nd-muted">{dest.ticker}</span>
                        </span>
                        <span className="text-[11px] text-nd-muted block">
                          Fee {r.feePercent.toFixed(2)}% · Impact {r.priceImpactPercent.toFixed(2)}% · {r.hops} hop{r.hops !== 1 ? 's' : ''}
                        </span>
                        {isBest && r.savedAmount > 0 && (
                          <span className="text-[10px] text-nd-positive font-semibold block">{formatSavingsToken(r.savedAmount, dest.ticker)} saved</span>
                        )}
                        {!isBest && r.savingsPercent > 0 && (
                          <span className="text-[10px] text-nd-danger block">-{r.savingsPercent.toFixed(2)}% vs best</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-5 text-center text-xs text-slate-400 font-medium">
              No routes available from this source
            </div>
          )}
        </div>
      ))}
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
          className="flex items-center gap-2 px-3.5 py-2 nd-nav-cta disabled:opacity-60 text-xs sm:text-sm"
        >
          {isConnecting ? <Spinner className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
          <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>
        {connectOpen && !isConnecting && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setConnectOpen(false)} />
            <div className="absolute right-0 mt-2 w-44 bg-white border border-nd-border rounded-xl overflow-hidden shadow-nd-md z-50">
              <div className="p-2 space-y-1">
                <button onClick={() => { setConnectOpen(false); connect('freighter'); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-nd-muted hover:text-nd-ink hover:bg-nd-raised rounded-lg transition-all">
                  <Wallet className="w-4 h-4 text-nd-accent" /><span className="font-semibold">Freighter</span>
                </button>
                <button onClick={() => { setConnectOpen(false); connect('albedo'); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-nd-muted hover:text-nd-ink hover:bg-nd-raised rounded-lg transition-all">
                  <Shield className="w-4 h-4 text-nd-accent-muted" /><span className="font-semibold">Albedo</span>
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
      <div className="flex items-center gap-1.5 bg-white border border-nd-border rounded-lg pl-3 pr-2 py-1.5 shadow-nd-sm">
        <div className="flex flex-col items-end pr-2 border-r border-nd-border">
          <span className="font-mono text-xs font-semibold text-nd-ink">{xlmBalance.toFixed(2)}</span>
          <span className="text-[10px] text-nd-muted">XLM</span>
        </div>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 pl-1.5 text-xs font-mono text-nd-secondary hover:text-nd-ink"
        >
          <span>{short}</span>
          <ChevronDown className="w-3 h-3 text-nd-muted" />
        </button>
      </div>
      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 nd-card-raised overflow-hidden z-50">
            <div className="p-3 border-b border-nd-border flex justify-between bg-nd-raised/40">
              <span className="text-xs text-nd-muted">{provider} connected</span>
              <Badge variant={network === 'mainnet' ? 'warning' : 'neutral'} className="text-[9px]">{network}</Badge>
            </div>
            <div className="p-1.5 space-y-0.5">
              <button onClick={handleCopy} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-nd-muted hover:text-nd-ink hover:bg-nd-raised rounded-lg">
                <Copy className="w-3.5 h-3.5" /><span>Copy address</span>
              </button>
              <a href={`https://stellar.expert/explorer/${network}/account/${publicKey}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-nd-muted hover:text-nd-ink hover:bg-nd-raised rounded-lg">
                <ExternalLink className="w-3.5 h-3.5" /><span>Stellar Expert</span>
              </a>
              <button onClick={handleAddTrustlines} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-nd-accent hover:text-nd-positive hover:bg-nd-accent-soft rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5" /><span>Add testnet trustlines</span>
              </button>
              <button onClick={toggleNetwork} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-nd-muted hover:text-nd-ink hover:bg-nd-raised rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5" /><span>Toggle network</span>
              </button>
              <div className="h-px bg-nd-border my-1" />
              <button onClick={() => { disconnect(); setDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-nd-danger hover:bg-red-50 rounded-lg">
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
    success: <CheckCircle className="w-4 h-4 text-nd-positive" />,
    error: <AlertCircle className="w-4 h-4 text-nd-danger" />,
    warning: <AlertCircle className="w-4 h-4 text-nd-warning" />,
    info: <Info className="w-4 h-4 text-nd-info" />,
  };
  const borders: Record<string, string> = {
    success: 'border-l-nd-positive',
    error: 'border-l-nd-danger',
    warning: 'border-l-nd-warning',
    info: 'border-l-nd-info',
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
            className={`pointer-events-auto flex items-start gap-2.5 p-3.5 nd-card-raised border-l-4 ${borders[t.type]}`}
          >
            {icons[t.type]}
            <span className="text-xs text-nd-ink font-medium flex-1">{t.message}</span>
            <button type="button" onClick={() => removeToast(t.id)} aria-label="Dismiss notification" title="Dismiss" className="text-nd-muted hover:text-nd-ink">
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
    <div className="nd-flat-card nd-flat-card--deep max-w-[480px] w-full mx-auto text-center">
      <div className="nd-flat-card-zone nd-flat-card-zone--deep">
      <div className="nd-flat-card-icon mx-auto mb-4">
        <CheckCircle className="w-6 h-6" />
      </div>
      <h2 className="nd-flat-card-title">Swap complete</h2>
      <p className="nd-flat-card-desc !text-white/70 mb-6">Transaction confirmed on Stellar ledger.</p>
      <div className="border border-nd-lime-accent/50 p-4 space-y-3 mb-6 text-left bg-nd-forest">
        <div className="flex justify-between text-xs">
          <span className="opacity-70">Amount paid</span>
          <span className="font-mono font-medium">{parseFloat(fromAmount).toFixed(4)} {fromToken.ticker}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="opacity-70">Amount received</span>
          <span className="font-mono font-bold text-nd-lime-accent">+{parseFloat(toAmount).toFixed(4)} {toToken.ticker}</span>
        </div>
        <div className="flex justify-between text-xs pt-2 border-t border-nd-lime-accent/30">
          <span className="opacity-70">NovaDEX savings</span>
          <span className="font-mono font-semibold text-nd-lime-accent">{formatSavingsToken(savedAmount, toToken.ticker)}</span>
        </div>
        <div className="flex justify-between text-xs pt-2 border-t border-nd-lime-accent/30">
          <span className="opacity-70">Transaction hash</span>
          <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-nd-lime-accent hover:underline flex items-center gap-1">
            {short}<ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
      <button type="button" onClick={onReset} className="w-full py-3 bg-nd-lime-zone text-nd-ink font-bold text-sm border border-nd-card-border hover:bg-white transition-colors">
        Make another swap
      </button>
      </div>
    </div>
  );
}

// Confirmation Modal
function ConfirmationModal({ isOpen, onClose, onConfirm, fromToken, toToken, fromAmount, route, slippagePercent, savingsAmount }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  fromToken: Token; toToken: Token; fromAmount: string; route: Route | null; slippagePercent: string;
  savingsAmount: number;
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
      <div className="relative w-full max-w-[440px] bg-white border border-nd-border rounded-xl overflow-hidden shadow-nd-lg z-10">
        <div className="p-4 border-b border-nd-border flex justify-between bg-nd-raised/40">
          <h3 className="text-base font-semibold text-nd-ink">Review swap</h3>
          {!signing && <button type="button" onClick={onClose} aria-label="Close review swap" title="Close" className="text-nd-muted hover:text-nd-ink"><X className="w-4 h-4" /></button>}
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-4 nd-panel">
            <div className="flex items-center gap-2">
              <TokenIcon token={fromToken} size={28} />
              <div>
                <span className="font-mono text-xs text-nd-muted block">From</span>
                <span className="font-mono text-sm font-bold text-nd-ink">{parseFloat(fromAmount).toFixed(4)} {fromToken.ticker}</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-nd-muted" />
            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="font-mono text-xs text-nd-muted block">To</span>
                <span className="font-mono text-sm font-bold text-nd-positive">+{route.outputAmount.toFixed(4)} {toToken.ticker}</span>
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
              <div key={label} className="flex justify-between py-1.5 border-b border-nd-border">
                <span className="text-nd-muted">{label}</span>
                <span className="font-mono text-nd-ink">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center p-2.5 bg-nd-accent-soft border border-nd-accent/20 rounded-lg mt-2">
              <span className="text-nd-positive flex items-center gap-1"><Info className="w-3 h-3" />NovaDEX savings</span>
              <span className="font-mono font-semibold text-nd-positive">{formatSavingsToken(savingsAmount, toToken.ticker)}</span>
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={handleConfirm}
              disabled={signing}
              className="w-full nd-btn-primary py-3 disabled:opacity-60"
            >
              {signing ? <><Spinner className="w-4 h-4" /><span>Awaiting Freighter...</span></> : <><Wallet className="w-4 h-4" /><span>Confirm swap</span></>}
            </button>
            {!signing && (
              <button onClick={onClose} className="w-full nd-btn-secondary py-2.5">
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
    <>
      <div className="nd-navbar-wrap">
        <nav className="nd-navbar">
          <div onClick={() => onNavigate('landing')} className="flex items-center gap-2 pl-2 cursor-pointer group shrink-0">
            <NovaDexLogo size={26} className="transition-transform group-hover:scale-105" />
            <span className="text-base font-bold tracking-tight text-nd-ink hidden sm:inline">
              Nova<span className="text-nd-accent">DEX</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={currentPath === item.key ? 'nd-nav-pill nd-nav-pill-active' : 'nd-nav-pill'}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pr-1 shrink-0">
            <div className="hidden sm:block">
              <WalletButton />
            </div>
            <button
              type="button"
              onClick={() => onNavigate('swap')}
              className="nd-nav-cta hidden sm:inline-flex"
            >
              Swap now
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2.5 rounded-full text-nd-muted hover:text-nd-ink hover:bg-nd-lime-zone transition-colors"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-[4.5rem] left-4 right-4 z-40 md:hidden"
          >
            <div className="nd-card-raised p-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
                  className={`w-full text-left py-2.5 px-4 rounded-full text-sm transition-all ${currentPath === item.key ? 'bg-nd-lime-zone text-nd-ink font-semibold' : 'text-nd-muted hover:bg-nd-raised'}`}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-2 border-t border-nd-border sm:hidden">
                <WalletButton />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
    selectedRoute, allRoutes, routeSources, savingsContext, isLoadingRoute,
    setFromToken, setToToken, setFromAmount, setSlippageTolerance, swapDirection, selectRoute, reset,
  } = useSwapStore();

  const [slippageOpen, setSlippageOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successPayload, setSuccessPayload] = useState<any>(null);

  const activeSlippage = slippageTolerance === 'custom' ? customSlippageValue : slippageTolerance;
  const routeSavings = selectedRoute
    ? savingsForRoute(selectedRoute, allRoutes, savingsContext)
    : 0;

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
    let finalStatus = 'reverted';
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
        const savedAmount = savingsForRoute(selectedRoute, allRoutes, savingsContext);
        const payload = { fromToken, toToken, fromAmount, toAmount, savedAmount, txHash: submitResponse.hash };
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
      const savedAmount = savingsForRoute(selectedRoute, allRoutes, savingsContext);
      const savingsUsdc = computeSavingsUsdc({
        savings_amount: savedAmount,
        asset_in_code: fromToken.ticker,
        asset_out_code: toToken.ticker,
        amount_in: parseFloat(fromAmount),
        amount_out: parseFloat(toAmount),
      });
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
          savings_usdc: savingsUsdc,
          amount_out_direct_best: parseFloat(toAmount) - savedAmount,
          route_fingerprint: selectedRoute.fingerprint,
          route_json: { path: selectedRoute.path.map((t: any) => t.ticker), hops: selectedRoute.hops },
          slippage_tolerance: parseFloat(activeSlippage || '0.5'),
          price_impact: selectedRoute.priceImpactPercent,
          protocol_fee_usdc: selectedRoute.outputAmount * 0.001,
          network: 'testnet',
          status: finalStatus,
        }),
      }).then(async (r) => {
        if (!r.ok) {
          const e = await r.json();
          addToast(`DB Error: ${e.error || 'Unknown'}`, 'error');
        } else {
          useDataStore.getState().bump();
        }
      }).catch(console.warn);
    }
  };

  if (successPayload) {
    return <SuccessCard {...successPayload} onReset={() => setSuccessPayload(null)} />;
  }

  const hasAmount = parseFloat(fromAmount) > 0;

  return (
    <div className="w-full max-w-[32rem] mx-auto">
      <PageHeader title="Swap" description="Best-price routing across SDEX, Aquarius, and split execution." />

      <div className="nd-flat-card nd-flat-card--mint">
        <div className="nd-flat-card-content p-5 md:p-6 space-y-1 relative !border-b-0">
          {/* Pay block */}
          <div className="pb-5 border-b border-nd-border">
            <div className="flex justify-between items-center mb-3">
              <span className="nd-section-label">You pay</span>
              {publicKey && (
                <span className="text-xs text-nd-muted">
                  Balance <span className="font-mono font-medium text-nd-ink">{(balances[fromToken.id] || 0).toFixed(2)}</span>
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
                className="font-mono font-semibold text-4xl md:text-[2.75rem] tracking-tight text-nd-ink bg-transparent outline-none w-full border-none p-0 placeholder:text-nd-border"
              />
              <div className="flex flex-col items-end gap-2 shrink-0">
                <TokenSelector token={fromToken} onSelect={setFromToken} />
                {publicKey && (balances[fromToken.id] || 0) > 0 && (
                  <button onClick={handleMaxClick} className="px-2.5 py-1 bg-nd-raised text-[11px] font-semibold text-nd-secondary hover:text-nd-ink border border-nd-border rounded-md transition-colors">Max</button>
                )}
              </div>
            </div>
          </div>

          {/* Direction toggle */}
          <div className="absolute top-[7.25rem] left-1/2 -translate-x-1/2 z-10">
            <button type="button" onClick={swapDirection} aria-label="Swap trade direction" title="Swap direction" className="p-2.5 bg-white border border-nd-border hover:border-nd-ink text-nd-muted hover:text-nd-ink transition-all rounded-lg shadow-nd-sm">
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          {/* Receive block */}
          <div className="pt-5 pb-5 border-b border-nd-border">
            <div className="flex justify-between items-center mb-3">
              <span className="nd-section-label">You receive</span>
              {publicKey && <span className="text-xs text-nd-muted">Balance <span className="font-mono font-medium text-nd-ink">{(balances[toToken.id] || 0).toFixed(2)}</span></span>}
            </div>
            <div className="flex items-center gap-4">
              {isLoadingRoute ? (
                <div className="h-11 w-40 bg-nd-raised animate-pulse rounded-lg" />
              ) : (
                <span className={`font-mono font-semibold text-4xl md:text-[2.75rem] tracking-tight block w-full ${toAmount ? 'text-nd-positive' : 'text-nd-border'}`}>{toAmount || '0.00'}</span>
              )}
              <div className="shrink-0 flex flex-col items-end gap-2">
                <TokenSelector token={toToken} onSelect={setToToken} />
              </div>
            </div>
          </div>

          {selectedRoute && routeSavings > 0 && (
            <div className="nd-highlight-card mt-4">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Savings vs single-venue route
              </span>
              <span className="text-xs font-semibold font-mono">
                {formatSavingsToken(routeSavings, toToken.ticker)}
              </span>
            </div>
          )}

          {selectedRoute && <div className="pt-4"><PriceImpactBar percent={selectedRoute.priceImpactPercent} /></div>}

          <div className="pt-4 border-t border-nd-border">
            <div className="flex justify-between items-center text-xs">
              <button onClick={() => setSlippageOpen(!slippageOpen)} className="flex items-center gap-1.5 text-nd-muted font-medium hover:text-nd-ink transition-colors">
                <Settings className="w-3.5 h-3.5" />
                <span>Slippage tolerance</span>
              </button>
              <span className="font-mono text-nd-secondary">{activeSlippage}%</span>
            </div>
            <AnimatePresence>
              {slippageOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
                  <div className="flex items-center gap-1.5 p-2 nd-panel">
                    {['0.1', '0.5', '1.0'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setSlippageTolerance(p)}
                        className={`flex-1 py-1.5 px-2 rounded-md font-mono text-xs transition-all border ${slippageTolerance === p ? 'bg-white border-nd-accent text-nd-accent' : 'border-transparent text-nd-muted hover:text-nd-ink'}`}
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
                        className={`w-full py-1.5 pl-2 pr-5 bg-white border rounded-md text-xs font-mono text-nd-ink focus:outline-none ${slippageTolerance === 'custom' ? 'border-nd-accent' : 'border-nd-border'}`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-nd-muted">%</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => {
              if (!publicKey) { connect('freighter'); return; }
              if (hasAmount && selectedRoute && selectedRoute.id !== 'route-empty') setConfirmOpen(true);
            }}
            disabled={(hasAmount && isLoadingRoute) || (hasAmount && selectedRoute?.id === 'route-empty')}
            className={`w-full py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 rounded-full mt-6 ${hasAmount && selectedRoute?.id !== 'route-empty' ? 'nd-btn-primary' : 'bg-nd-raised text-nd-muted cursor-not-allowed border border-nd-border'}`}
          >
            {isLoadingRoute ? <><Spinner className="w-4 h-4" /><span>Finding best route...</span></> :
              !publicKey ? 'Connect Wallet' :
              !hasAmount ? 'Enter an amount' :
              selectedRoute?.id === 'route-empty' ? 'No Route Available' : 'Review Swap'}
          </button>
        </div>
        <CardFooterNav label="Best-price routing" to="routes" icon={<ArrowDownUp className="w-4 h-4" />} />
      </div>

      {hasAmount && !isLoadingRoute && routeSources.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <SourceGroupedRoutesList
            sources={routeSources}
            selectedRouteId={selectedRoute?.id}
            onSelectRoute={selectRoute}
          />
        </motion.div>
      )}
      {hasAmount && isLoadingRoute && (
        <div className="nd-card p-6 flex justify-center mt-6">
          <Spinner className="w-6 h-6" />
        </div>
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
        savingsAmount={routeSavings}
      />
    </div>
  );
}

// ============================================================
// HISTORY VIEW
// ============================================================

function HistoryView({ refreshKey = 0 }: { refreshKey?: number }) {
  const { publicKey, connect } = useWalletStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');

  const loadHistory = useCallback(() => {
    if (!publicKey) return;
    setLoading(true);
    fetch(`/api/users/${publicKey}/history?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setHistory(d.swaps || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [publicKey]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  useEffect(() => {
    const onFocus = () => loadHistory();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadHistory]);

  if (!publicKey) {
    return (
      <div className="w-full max-w-md mx-auto pt-12">
        <EmptyState
          title="Connect wallet to view history"
          description="Your swap history is linked to your Freighter wallet address."
          btnLabel="Connect Freighter"
          onBtnClick={() => connect('freighter')}
          icon={<History className="w-8 h-8 text-nd-accent" />}
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
      <PageHeader title="History" description="Swap records for your connected wallet, synced from NovaDEX routing." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Your total savings" value={formatSavingsUsd(history.reduce((a, s) => a + effectiveSavingsUsdc(s), 0))} subValue="Extra output vs single-venue routes" footerLabel="View analytics" footerTo="analytics" />
        <MetricCard label="Total swaps" value={history.length.toString()} subValue="Recorded on-chain" footerLabel="View swap" footerTo="swap" />
        <MetricCard label="Total volume (USD)" value={formatTotalVolume(history)} subValue="Stablecoin notional" footerLabel="View analytics" footerTo="analytics" />
      </div>

      <div className="nd-card overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b border-nd-border bg-nd-raised/50">
          <div className="flex items-center gap-2 w-full md:w-auto">
            {['All', 'Completed', 'Reverted'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterStatus === s ? 'bg-white text-nd-ink border border-nd-border shadow-nd-sm' : 'text-nd-muted hover:text-nd-ink'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nd-muted" />
            <input type="text" placeholder="Search by asset..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white border border-nd-border rounded-lg text-xs text-nd-ink focus:outline-none focus:border-nd-accent" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="w-6 h-6" /></div>
        ) : (
          <div className="nd-table-wrap border-0 rounded-none">
            <table className="nd-table text-xs min-w-[700px] font-mono">
              <thead>
                <tr>
                  {['Date', 'Pair', 'Amount In', 'Amount Out', 'Savings', 'Status', 'Tx Hash'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-nd-muted font-sans">No swaps found</td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="text-nd-muted font-sans">{new Date(s.executed_at).toLocaleDateString()}</td>
                    <td className="font-semibold text-nd-ink font-sans">{s.asset_in_code} / {s.asset_out_code}</td>
                    <td>{Number(s.amount_in).toFixed(2)} <span className="text-nd-muted text-[10px]">{s.asset_in_code}</span></td>
                    <td className="text-nd-positive font-semibold">{Number(s.amount_out).toFixed(4)} <span className="text-nd-muted text-[10px]">{s.asset_out_code}</span></td>
                    <td className="text-nd-positive font-semibold">{formatSavingsCell(effectiveSavingsUsdc(s), s.asset_out_code)}</td>
                    <td><Badge variant={s.status === 'completed' ? 'success' : 'danger'}>{s.status}</Badge></td>
                    <td>
                      <a href={`https://stellar.expert/explorer/testnet/tx/${s.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-nd-accent hover:underline flex items-center gap-1 font-sans">
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

function AnalyticsView({ refreshKey = 0 }: { refreshKey?: number }) {
  const { publicKey } = useWalletStore();
  const dataTick = useDataStore((s) => s.tick);
  const combinedRefresh = refreshKey + dataTick;
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const volumeData = globalStats?.volumeData ?? [];
  const savingsData = globalStats?.savingsData ?? [];

  const loadGlobalStats = useCallback(() => {
    setLoading(true);
    fetch(`/api/analytics/global?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (!d.error) setGlobalStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadPersonalStats = useCallback(() => {
    if (!publicKey) {
      setAnalytics(null);
      return;
    }
    fetch(`/api/users/${publicKey}/analytics?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (!d.error) setAnalytics(d); })
      .catch(() => setAnalytics(null));
  }, [publicKey]);

  useEffect(() => {
    loadGlobalStats();
    loadPersonalStats();
  }, [loadGlobalStats, loadPersonalStats, combinedRefresh]);

  useEffect(() => {
    const onFocus = () => {
      loadGlobalStats();
      loadPersonalStats();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadGlobalStats, loadPersonalStats]);

  const fmtUsd = (n: number) => formatUsd(n);
  const fmtCount = (n: number) => Number(n || 0).toLocaleString();
  const tooltipStyle = { backgroundColor: '#141a22', borderColor: '#d8dde6', color: '#f8f9fb', borderRadius: 8, fontSize: 12 };

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Platform-wide routing performance and your personal trading metrics." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard variant="mint" label="Total swap volume" value={loading ? 'Loading...' : fmtUsd(globalStats?.total_volume_usdc)} subValue="USD notional" footerLabel="View history" footerTo="history" />
        <MetricCard variant="blue" label="Total swaps" value={loading ? 'Loading...' : fmtCount(globalStats?.total_swaps)} subValue={`${fmtCount(globalStats?.total_swaps_completed ?? globalStats?.total_swaps)} completed`} footerLabel="View history" footerTo="history" />
        <MetricCard variant="lavender" label="Total savings" value={loading ? 'Loading...' : formatSavingsUsd(globalStats?.total_savings_usdc)} subValue="Extra output returned to traders" footerLabel="View swap" footerTo="swap" />
        <MetricCard variant="peach" label="Unique wallets" value={loading ? 'Loading...' : fmtCount(globalStats?.unique_wallets)} subValue="Wallets with swap history" footerLabel="Explore" footerTo="about" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PanelCard title="Weekly volume (USD)" variant="mint" footerLabel="View history" footerTo="history">
          <div className="h-56">
            {volumeData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No swap data yet</div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2d6a5a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2d6a5a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#1F2937" tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis stroke="#1F2937" tickFormatter={v => `$${v / 1000}k`} tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="vol" stroke="#2d6a5a" strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </PanelCard>
        <PanelCard title="Weekly savings (USD)" variant="blue" footerLabel="View swap" footerTo="swap">
          <div className="h-56">
            {savingsData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No swap data yet</div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#1F2937" tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis stroke="#1F2937" tickFormatter={v => `$${v / 1000}k`} tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="sav" fill="#1f7a5c" radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </PanelCard>
      </div>

      {publicKey && analytics && (
        <PanelCard title="Your personal analytics" variant="lavender" footerLabel="View history" footerTo="history">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Your total savings" value={formatSavingsUsd(analytics.total_savings_usdc ?? analytics.totalSavings)} subValue="Extra output vs single-venue routes" footerLabel="View swap" footerTo="swap" />
            <MetricCard label="Your total volume" value={fmtUsd(analytics.total_volume_usdc ?? analytics.totalVolume)} subValue="USD notional" footerLabel="View history" footerTo="history" />
            <MetricCard label="Avg slippage used" value={`${Number(analytics.avg_slippage ?? analytics.avgSlippage ?? 0).toFixed(2)}%`} subValue="Per swap" footerLabel="View routes" footerTo="routes" />
          </div>
          {(analytics.most_used_pairs ?? analytics.mostUsedPairs ?? []).length > 0 && (
            <div className="mt-4">
              <h4 className="nd-section-label mb-3">Most used pairs</h4>
              <div className="space-y-2">
                {(analytics.most_used_pairs ?? analytics.mostUsedPairs).map(({ pair, volume }: any) => {
                  const pairs = analytics.most_used_pairs ?? analytics.mostUsedPairs;
                  const maxVol = pairs[0].volume;
                  return (
                    <div key={pair} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono text-slate-500">
                        <span>{pair}</span><span>{fmtUsd(volume)}</span>
                      </div>
                      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full w-full bg-nd-accent rounded-full [clip-path:inset(0_${maxVol > 0 ? 100 - (volume / maxVol) * 100 : 100}%_0_0)]`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </PanelCard>
      )}
    </div>
  );
}

// ============================================================
// ROUTE EXPLORER VIEW
// ============================================================

function RouteExplorerView({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { applyExplorerSelection } = useSwapStore();
  const [assetA, setAssetA] = useState<Token>(TOKENS[0]);
  const [assetB, setAssetB] = useState<Token>(TOKENS[1]);
  const [amount, setAmount] = useState('1500');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeSources, setRouteSources] = useState<RouteSourceGroup[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [searching, setSearching] = useState(false);
  const [slider, setSlider] = useState(50);

  const run = useCallback(async () => {
    const val = parseFloat(amount);
    if (!val) {
      setRoutes([]);
      setRouteSources([]);
      setSelectedRoute(null);
      return;
    }
    setSearching(true);
    try {
      const result = await fetchRoutes(assetA, assetB, val);
      setRoutes(result.allRoutes);
      setRouteSources(result.sources);
      setSelectedRoute(result.winningRoute.id !== 'route-empty' ? result.winningRoute : result.allRoutes[0] ?? null);
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

  const handleUseRoute = () => {
    if (!selectedRoute || selectedRoute.id === 'route-empty') return;
    applyExplorerSelection({
      fromToken: assetA,
      toToken: assetB,
      fromAmount: amount,
      selectedRoute,
      allRoutes: routes,
      routeSources,
    });
    onNavigate('swap');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Route explorer"
        description="Compare SDEX, Aquarius, and split routes side by side before you swap."
      />

      <PanelCard
        title="Search parameters"
        variant="mint"
        footerLabel="View swap"
        footerTo="swap"
        action={searching ? <Spinner className="w-4 h-4" /> : undefined}
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 grow w-full">
            <div className="flex-1">
              <span className="nd-section-label block mb-1.5">Source</span>
              <TokenSelector token={assetA} onSelect={setAssetA} />
            </div>
            <ChevronRight className="w-4 h-4 text-nd-muted mt-5" />
            <div className="flex-1">
              <span className="nd-section-label block mb-1.5">Destination</span>
              <TokenSelector token={assetB} onSelect={setAssetB} />
            </div>
          </div>
          <div className="w-full sm:w-44">
            <label htmlFor="route-explorer-amount" className="nd-section-label block mb-1.5">Amount</label>
            <input id="route-explorer-amount" type="text" value={amount} onChange={e => { if (/^[0-9.]*$/.test(e.target.value)) setAmount(e.target.value); }} aria-label="Swap amount" className="w-full py-2 px-3 nd-input-surface font-mono text-sm text-nd-ink focus:outline-none focus:border-nd-accent" />
          </div>
          <button type="button" onClick={run} className="w-full sm:w-auto nd-btn-primary mt-5 sm:mt-0">
            Find routes
          </button>
        </div>
      </PanelCard>

      <PanelCard
        title="Route comparison by source"
        description="SDEX, Aquarius, and split orders searched in parallel"
        variant="blue"
        footerLabel="Open swap"
        footerTo="swap"
        action={selectedRoute ? (
          <button type="button" onClick={handleUseRoute} className="nd-btn-primary text-xs py-2 px-4">
            Swap with selected
          </button>
        ) : undefined}
      >
        {searching ? (
          <div className="flex justify-center py-12"><Spinner className="w-6 h-6" /></div>
        ) : routeSources.length > 0 ? (
          <SourceGroupedRoutesList
            sources={routeSources}
            selectedRouteId={selectedRoute?.id}
            onSelectRoute={setSelectedRoute}
          />
        ) : (
          <div className="py-10 text-center text-nd-muted text-sm">Enter parameters to explore routes</div>
        )}
      </PanelCard>

      <PanelCard title="Order size simulator" description="Drag to see how routes change with order size" variant="peach" footerLabel="View routes" footerTo="routes">
        <div className="space-y-4">
        <div className="flex justify-end">
          <span className="font-mono text-sm font-bold text-nd-accent nd-panel px-3 py-1">
            {parseInt(amount).toLocaleString()} {assetA.ticker}
          </span>
        </div>
        <label htmlFor="route-explorer-size-slider" className="sr-only">Order size simulator</label>
        <input id="route-explorer-size-slider" type="range" min={5} max={99} value={slider} onChange={e => handleSlider(parseInt(e.target.value))} aria-label="Order size simulator" className="w-full cursor-pointer" />
        <div className="flex justify-between text-[11px] font-mono text-nd-muted">
          <span>Min (10)</span><span>Split crossover (~12,500)</span><span>Max (100k)</span>
        </div>
        <div className="p-3.5 nd-panel flex items-center gap-2 text-xs">
          <Info className="w-4 h-4 text-nd-accent shrink-0" />
          <p className="text-nd-muted">At larger sizes, NovaDEX splits orders across SDEX and Aquarius to minimize slippage. Watch the route change above.</p>
        </div>
        </div>
      </PanelCard>
    </div>
  );
}

// ============================================================
// POOLS VIEW
// ============================================================

function formatPoolUsd(value: number): string {
  if (!value || value <= 0) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function PoolsView({ refreshKey = 0 }: { refreshKey?: number }) {
  const [selected, setSelected] = useState<Pool | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [network, setNetwork] = useState('testnet');

  const loadPools = useCallback(() => {
    setLoading(true);
    fetch(`/api/pools?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setPools(d.pools || []);
        setNetwork(d.network || 'testnet');
        setLastUpdated(new Date());
      })
      .catch(() => setPools([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPools();
  }, [loadPools, refreshKey]);

  useEffect(() => {
    const onFocus = () => loadPools();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadPools]);

  const totalTvl = pools.reduce((sum, p) => sum + p.tvl, 0);
  const totalRouted = pools.reduce((sum, p) => sum + p.routingVolume, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liquidity pools"
        description={`Live AMM pools and SDEX orderbook depth from Horizon (${network}).`}
        action={(
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}</Badge>
            <button type="button" onClick={loadPools} disabled={loading} className="nd-btn-secondary text-xs py-2 px-3 disabled:opacity-50">
              Refresh
            </button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Pools tracked" value={loading ? '...' : pools.length.toString()} subValue="AMM + SDEX depth" footerLabel="View pools" footerTo="pools" />
        <MetricCard label="Total liquidity" value={loading ? '...' : formatPoolUsd(totalTvl)} subValue="USD estimated depth" footerLabel="View pools" footerTo="pools" />
        <MetricCard label="NovaDEX routed" value={loading ? '...' : formatPoolUsd(totalRouted)} subValue="All-time swap volume" footerLabel="View analytics" footerTo="analytics" />
      </div>

      <div className="nd-card overflow-hidden">
        <div className="nd-table-wrap border-0 rounded-none">
          <table className="nd-table text-xs min-w-[700px] font-mono">
            <thead>
              <tr>
                {['Pool', 'Source', 'TVL / Depth', '24h Volume', 'Fee', 'NovaDEX Routed', ''].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-nd-muted font-sans">Loading live pool data from Horizon...</td></tr>
              ) : pools.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-nd-muted font-sans">No liquidity found — run setup-testnet-liquidity.mjs to seed SDEX offers</td></tr>
              ) : pools.map((pool) => (
                <tr key={pool.id} onClick={() => setSelected(pool)} className="cursor-pointer group">
                  <td className="font-semibold text-nd-ink font-sans">
                    <div className="flex items-center gap-2">
                      <TokenIcon token={pool.tokenA} size={18} />
                      <TokenIcon token={pool.tokenB} size={18} />
                      <span className="group-hover:text-nd-accent transition-colors">{pool.tokenA.ticker} / {pool.tokenB.ticker}</span>
                    </div>
                  </td>
                  <td>
                    <Badge variant={pool.source === 'amm' ? 'success' : 'accent'}>
                      {pool.source === 'amm' ? 'AMM Pool' : 'SDEX Book'}
                    </Badge>
                  </td>
                  <td className="text-nd-ink font-medium">{formatPoolUsd(pool.tvl)}</td>
                  <td className="text-nd-muted">{formatPoolUsd(pool.volume24h)}</td>
                  <td className="text-nd-muted">{pool.feeRate.toFixed(2)}%</td>
                  <td className="text-nd-positive font-medium">{formatPoolUsd(pool.routingVolume)}</td>
                  <td className="text-right"><span className="text-[11px] text-nd-muted group-hover:text-nd-accent font-sans">View</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-[500px] nd-card-raised overflow-hidden z-10">
            <div className="p-4 border-b border-nd-border flex justify-between items-center bg-nd-raised/40">
              <h3 className="text-base font-semibold text-nd-ink flex items-center gap-2">
                <TokenIcon token={selected.tokenA} size={18} />
                <TokenIcon token={selected.tokenB} size={18} />
                {selected.tokenA.ticker} / {selected.tokenB.ticker}
              </h3>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close pool details" className="nd-btn-secondary text-xs py-1.5 px-2.5">Close</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <Badge variant={selected.source === 'amm' ? 'success' : 'accent'}>
                  {selected.source === 'amm' ? 'Horizon AMM Pool' : 'SDEX Orderbook Depth'}
                </Badge>
                {selected.id.startsWith('00') && (
                  <a
                    href={`https://stellar.expert/explorer/${network}/liquidity-pool/${selected.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-nd-accent hover:underline self-center"
                  >
                    View on Stellar Expert
                  </a>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                {[
                  { label: selected.source === 'amm' ? 'TVL' : 'Orderbook Depth', value: formatPoolUsd(selected.tvl) },
                  { label: '24h Volume', value: formatPoolUsd(selected.volume24h) },
                  { label: 'LP / Maker Fee', value: `${selected.feeRate.toFixed(2)}%` },
                  { label: 'NovaDEX Routed', value: formatPoolUsd(selected.routingVolume) },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 nd-panel">
                    <span className="text-nd-muted block">{label}</span>
                    <span className="font-mono text-sm font-bold text-nd-ink mt-0.5 block">{value}</span>
                  </div>
                ))}
              </div>
              {selected.source === 'amm' && selected.reserveAAmount != null && selected.reserveBAmount != null && (
                <div className="p-3 nd-panel text-xs space-y-1.5 font-mono">
                  <p className="text-nd-muted font-sans font-medium">Pool reserves (live)</p>
                  <p className="text-nd-ink">{selected.reserveAAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selected.tokenA.ticker}</p>
                  <p className="text-nd-ink">{selected.reserveBAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selected.tokenB.ticker}</p>
                  {selected.totalShares && <p className="text-nd-muted pt-1">LP shares: {selected.totalShares}</p>}
                </div>
              )}
              {selected.source === 'sdex' && (
                <div className="p-3 nd-panel text-xs text-nd-muted">
                  Depth computed from live SDEX bid/ask offers on Horizon. NovaDEX routes swaps through this liquidity when AMM pools are unavailable.
                </div>
              )}
              <a href="https://aquarius.exchange" target="_blank" rel="noopener noreferrer" className="w-full nd-btn-secondary py-2.5 text-sm font-medium text-center block">
                Add liquidity on Aquarius
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
      <PageHeader
        title="About NovaDEX"
        description="Swap any Stellar asset. Get the best price. No thinking required."
      />

      <div className="nd-card p-6 space-y-4 text-sm text-nd-muted leading-relaxed">
        <p>NovaDEX is Stellar&apos;s first intent-based DEX aggregator. It simultaneously fetches live price data from SDEX order books, Aquarius AMM pools, and anchor exchange rates, then finds the optimal route - including multi-hop paths and order splits for large trades.</p>
        <p>The Aggregator Router Soroban contract executes swaps atomically. Either the full swap completes at the quoted price within your slippage tolerance, or the entire transaction reverts. No partial fills. No unexpected outcomes.</p>
      </div>

      <div className="nd-card p-5">
        <h3 className="text-sm font-semibold text-nd-ink mb-4">Intent routing pipeline</h3>
        <div className="nd-panel p-4 flex flex-col items-center gap-2 font-mono text-[10px] text-nd-muted">
          <div className="flex items-center gap-2">
            <span className="nd-panel px-2 py-1 bg-white">Trader intent</span>
            <span className="text-nd-muted">→</span>
            <span className="bg-nd-accent-soft text-nd-accent px-2 py-1 rounded border border-nd-accent/25 font-semibold">NovaDEX router</span>
          </div>
          <div className="text-nd-muted py-1">│ ▼</div>
          <div className="flex border border-nd-border p-1 rounded gap-3 bg-white">
            <span className="px-1 py-0.5 text-[9px] uppercase">SDEX order depth</span>
            <span className="text-nd-muted font-bold">+</span>
            <span className="px-1 py-0.5 text-[9px] uppercase">Aquarius AMM pools</span>
          </div>
          <div className="text-nd-muted py-1">│ ▼</div>
          <div className="flex items-center gap-2">
            <span className="nd-panel px-2 py-1 bg-white">Atomic split compiles</span>
            <span className="text-nd-muted">→</span>
            <span className="bg-nd-ink text-nd-positive px-2 py-1 rounded border border-nd-positive/20 font-semibold">Ledger confirmed</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold text-nd-ink">Soroban contract directory</h3>
        <div className="nd-table-wrap">
          <table className="nd-table text-xs font-mono">
            <thead>
              <tr>
                <th>Contract</th>
                <th>ID</th>
                <th className="text-right">Network</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c, i) => (
                <tr key={i}>
                  <td className="text-nd-ink font-sans font-medium">{c.name}</td>
                  <td className="text-nd-muted">
                    <span className="inline-flex items-center gap-2">
                      <span className="truncate max-w-[200px]">{c.id}</span>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(c.id); addToast('Copied!', 'success'); }} aria-label={`Copy ${c.name} contract address`} title="Copy address" className="text-nd-muted hover:text-nd-accent p-1">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </td>
                  <td className="text-right"><Badge variant="neutral">{c.scope}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-semibold text-nd-ink">Frequently asked questions</h3>
        <div className="border-t border-nd-border">
          {faqs.map((item, i) => <AccordionItem key={i} question={item.q} answer={item.a} />)}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-nd-muted hover:text-nd-ink transition-colors">GitHub</a>
        <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="text-nd-muted hover:text-nd-ink transition-colors">Twitter</a>
      </div>
    </div>
  );
}

// ============================================================
// LANDING PAGE
// ============================================================

function LandingPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-nd-bg overflow-hidden">
      <div className="nd-navbar-wrap">
        <header className="nd-navbar">
          <div className="flex items-center gap-2 pl-2">
            <NovaDexLogo size={26} />
            <span className="text-base font-bold tracking-tight text-nd-ink hidden sm:inline">
              Nova<span className="text-nd-accent">DEX</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {[
              { href: '#how-it-works', label: 'How it works' },
              { href: '#features', label: 'Features' },
              { href: '#infrastructure', label: 'Infrastructure' },
            ].map((item) => (
              <a key={item.href} href={item.href} className="nd-nav-pill">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 pr-1">
            <button type="button" onClick={() => onNavigate('about')} className="nd-nav-pill hidden sm:inline-flex">
              About
            </button>
            <button type="button" onClick={() => onNavigate('swap')} className="nd-nav-cta">
              Launch app
            </button>
            <button
              type="button"
              onClick={() => setMobileNav(!mobileNav)}
              className="md:hidden p-2.5 rounded-full text-nd-muted hover:bg-nd-mint-header"
              aria-label="Toggle menu"
            >
              {mobileNav ? <X className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            </button>
          </div>
        </header>
      </div>

      <section className="relative w-full max-w-6xl mx-auto px-6 pt-28 pb-20 md:pt-36 md:pb-28 flex flex-col md:flex-row items-center gap-14">
        <div className="flex-1 text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-nd-border text-nd-secondary text-xs font-mono font-semibold uppercase tracking-wider mb-6 shadow-nd-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nd-accent opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-nd-accent" />
            </span>
            Stellar intent aggregator
          </div>
          <h1 className="text-4xl md:text-[3.5rem] font-serif font-normal tracking-tight text-nd-ink leading-[1.06] mb-5">
            Swap any asset.<br />
            <span className="italic text-nd-accent">Get the best price.</span>
          </h1>
          <p className="text-base md:text-lg text-nd-muted max-w-lg leading-relaxed mb-9">
            NovaDEX aggregates liquidity from SDEX, Aquarius, and anchors — routing each trade through the most efficient path automatically.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button type="button" onClick={() => onNavigate('swap')} className="nd-btn-primary px-7 py-3">
              Start swapping <ChevronRight className="w-4 h-4" />
            </button>
            <a href="#how-it-works" className="nd-btn-secondary px-7 py-3 text-center">
              Learn more
            </a>
          </div>
        </div>

        <div className="flex-1 relative w-full max-w-md hidden md:block">
          <ServiceCard variant="mint" eyebrow="Live preview" footerLabel="Open swap" footerTo="swap">
            <div className="space-y-6 mt-1">
              <div>
                <span className="nd-flat-card-eyebrow mb-2">Intent</span>
                <p className="font-mono text-2xl font-semibold text-nd-ink">1,000 <span className="text-nd-muted">XLM</span></p>
              </div>
              <div className="w-10 h-10 border border-nd-lime-accent bg-white flex items-center justify-center text-nd-accent">
                <ArrowDownUp className="w-4 h-4" />
              </div>
              <div>
                <span className="nd-flat-card-eyebrow mb-2">Outcome</span>
                <p className="font-mono text-2xl font-semibold text-nd-positive">141.25 <span className="text-nd-muted">USDC</span></p>
              </div>
              <div className="pt-4 border-t border-nd-lime-accent/50 flex items-center gap-2 text-sm font-medium text-nd-positive">
                <CheckCircle className="w-4 h-4" /> +3.84 USDC saved via routing
              </div>
            </div>
          </ServiceCard>
        </div>
      </section>

      <section className="w-full bg-white py-20 border-y border-nd-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl md:text-4xl font-serif text-nd-ink mb-3">Stellar DeFi has a fragmentation problem</h2>
            <p className="text-nd-muted">Liquidity is scattered across multiple protocols, making efficient execution difficult for traders.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { v: 'mint' as CardVariant, n: '01', t: 'Scattered Liquidity', d: 'Liquidity is spread across SDEX order books, Aquarius AMM pools, and anchor rates with no unified entry point.', tags: ['SDEX', 'AMM', 'Anchors'] },
              { v: 'blue' as CardVariant, n: '02', t: 'Manual Trade Parsing', d: 'Traders must manually check bid/ask depth across multiple sources, compute split ratios, and execute separately.', tags: ['Depth', 'Splits'] },
              { v: 'peach' as CardVariant, n: '03', t: 'Value Left Behind', d: 'Direct single-source swaps suffer significant price slippage. Many Stellar swaps leave money on the table.', tags: ['Slippage', 'Savings'] },
            ].map(({ v, n, t, d, tags }) => (
              <ServiceCard key={n} variant={v} eyebrow={n} title={t} description={d} tags={tags} footerLabel="Explore" footerTo="about" />
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="w-full max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl md:text-4xl font-serif text-nd-ink mb-3">Atomic routing sequence</h2>
          <p className="text-nd-muted">Either the full trade completes at the quoted price, or the transaction reverts entirely.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { v: 'mint' as CardVariant, phase: 'Phase 1', label: 'Trade intent', desc: 'Enter target assets and amount.' },
            { v: 'lavender' as CardVariant, phase: 'Phase 2', label: 'Multi-source sweep', desc: 'Parallel fetch from SDEX, Aquarius, and anchors.' },
            { v: 'blue' as CardVariant, phase: 'Phase 3', label: 'Atomic execution', desc: 'Soroban compiles the optimal path into one ledger event.' },
          ].map((item) => (
            <ServiceCard key={item.phase} variant={item.v} eyebrow={item.phase} title={item.label} description={item.desc} footerLabel="Step" footerTo="routes" />
          ))}
        </div>
      </section>

      <section id="features" className="w-full bg-nd-raised py-20 border-y border-nd-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-4xl font-serif text-nd-ink mb-3">Built for execution quality</h2>
            <p className="text-nd-muted">Routing, savings proof, and analytics designed for serious Stellar traders.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: <Award className="w-5 h-5" />, title: 'Savings proof on-chain', description: 'Every routed swap records an immutable savings proof. Cryptographically verifiable on-chain.', tags: ['Soroban', 'Proof'] },
              { icon: <Shield className="w-5 h-5" />, title: 'Wallet-native identity', description: 'No registration. Your Freighter public key is your identity across the entire app.', tags: ['Freighter', 'Non-custodial'] },
              { icon: <Sliders className="w-5 h-5" />, title: 'Smart slippage engine', description: 'Adaptive slippage tolerance calculated from order book depth.', tags: ['Adaptive', 'Depth'] },
              { icon: <Layers className="w-5 h-5" />, title: 'Route fingerprinting', description: 'Every swap path gets a unique fingerprint — full audit trail.', tags: ['Audit', 'Hash'] },
              { icon: <TrendingUp className="w-5 h-5" />, title: 'Price impact simulation', description: 'See exactly how your trade moves the market before you execute.', tags: ['Simulation'] },
              { icon: <BarChart3 className="w-5 h-5" />, title: 'Personal analytics', description: 'Volume, savings, favourite pairs — all private under your wallet key.', tags: ['Analytics'] },
            ].map((item, i) => (
              <FeatureCard key={item.title} {...item} variant={FEATURE_VARIANTS[i % FEATURE_VARIANTS.length]} />
            ))}
          </div>
        </div>
      </section>

      <section id="infrastructure" className="w-full bg-white py-20 text-center border-t border-nd-border">
        <h2 className="text-2xl md:text-4xl font-serif text-nd-ink mb-3">Start swapping smarter</h2>
        <p className="text-base text-nd-muted max-w-md mx-auto mb-8">Connect your Freighter wallet and discover optimized routes in seconds.</p>
        <button type="button" onClick={() => onNavigate('swap')} className="nd-btn-primary px-8 py-3">Launch app</button>
      </section>

      <footer className="py-8 border-t border-nd-border bg-white text-center text-xs text-nd-muted">
        <p className="font-medium">NovaDEX — Stellar Intent Aggregator — Powered by Soroban & Freighter</p>
        <p className="mt-2 text-nd-border-strong">Built for Stellar Hackathon 2026</p>
      </footer>
    </div>
  );
}

// ============================================================
// MAIN APP SHELL
// ============================================================

function parseHashRoute(hash: string): string {
  if (!hash.startsWith('#/app')) return 'landing';
  const sub = hash.replace('#/app', '');
  const map: Record<string, string> = {
    '/history': 'history',
    '/analytics': 'analytics',
    '/routes': 'routes',
    '/pools': 'pools',
    '/about': 'about',
  };
  return map[sub] || 'swap';
}

function pathToHash(path: string): string {
  if (path === 'landing') return '';
  if (path === 'swap') return '#/app';
  return `#/app/${path}`;
}

export default function NovaDEXApp() {
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window === 'undefined') return 'landing';
    return parseHashRoute(window.location.hash);
  });
  const [analyticsTick, setAnalyticsTick] = useState(0);
  const dataTick = useDataStore((s) => s.tick);
  const { publicKey, balances } = useWalletStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    const syncRouteFromUrl = () => {
      setCurrentPath(parseHashRoute(window.location.hash));
    };

    syncRouteFromUrl();
    window.addEventListener('hashchange', syncRouteFromUrl);
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => {
      window.removeEventListener('hashchange', syncRouteFromUrl);
      window.removeEventListener('popstate', syncRouteFromUrl);
    };
  }, []);

  useEffect(() => {
    if (currentPath === 'analytics') {
      setAnalyticsTick((t) => t + 1);
    }
    if (['history', 'analytics', 'swap', 'routes', 'pools'].includes(currentPath)) {
      useDataStore.getState().bump();
    }
  }, [currentPath]);

  const navigateTo = useCallback((path: string) => {
    const nextPath = path === 'landing' ? 'landing' : path;
    setCurrentPath(nextPath);

    const nextHash = pathToHash(path);
    const base = `${window.location.pathname}${window.location.search}`;
    const nextUrl = nextHash ? `${base}${nextHash}` : base;

    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
      window.history.pushState(null, '', nextUrl);
    }
  }, []);

  return (
    <CardNavContext.Provider value={navigateTo as (path: AppPath) => void}>
    <div className="flex flex-col min-h-screen nd-shell text-nd-ink selection:bg-nd-accent-soft/40">
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
          <main className="flex-grow bg-nd-bg pt-24 md:pt-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPath}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="max-w-6xl w-full mx-auto px-4 md:px-6 py-8 md:py-10"
              >
                {currentPath === 'swap' && <SwapView />}
                {currentPath === 'history' && <HistoryView refreshKey={dataTick} />}
                {currentPath === 'analytics' && <AnalyticsView refreshKey={analyticsTick} />}
                {currentPath === 'routes' && <RouteExplorerView onNavigate={navigateTo} />}
                {currentPath === 'pools' && <PoolsView refreshKey={dataTick} />}
                {currentPath === 'about' && <AboutView />}
              </motion.div>
            </AnimatePresence>
          </main>
          <footer className="h-14 bg-white border-t border-nd-border flex items-center">
            <div className="w-full max-w-6xl mx-auto px-4 md:px-6 flex justify-between items-center text-xs text-nd-muted">
              <div className="flex items-center gap-1.5">
                <NovaDexLogo size={16} />
                <span>NovaDEX</span>
                <span>-</span>
                <Badge variant="neutral" className="text-[8px]">{useWalletStore.getState().network || 'disconnected'}</Badge>
              </div>
              <div className="flex items-center gap-4">
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-slate-500">GitHub</a>
                <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-slate-500">Twitter</a>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
    </CardNavContext.Provider>
  );
}
