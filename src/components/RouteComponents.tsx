/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, ChevronUp, Layers, Info } from 'lucide-react';
import { Token, Route } from '../types';
import { TokenIcon } from './TokenComponents';
import { Badge } from './UI';

// --- RoutePathPills ---
interface RoutePathPillsProps {
  path: Token[];
  size?: 'sm' | 'md';
}

export function RoutePathPills({ path, size = 'md' }: RoutePathPillsProps) {
  const isSm = size === 'sm';

  return (
    <div className="flex items-center flex-wrap gap-y-1.5 gap-x-1 sm:gap-x-1.5">
      {path.map((token, index) => {
        const isNotLast = index < path.length - 1;

        return (
          <React.Fragment key={`${token.id}-${index}`}>
            <div className={`inline-flex items-center gap-1.5 bg-bg-base/80 border border-border-default/50 px-2 py-1 rounded-sm shadow-sm`}>
              <TokenIcon token={token} size={isSm ? 14 : 16} />
              <span className={`font-mono font-medium ${isSm ? 'text-xs' : 'text-xs sm:text-sm'} text-text-primary`}>
                {token.ticker}
              </span>
            </div>
            
            {isNotLast && (
              <ChevronRight className={`text-text-tertiary shrink-0 ${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// --- RouteCard ---
interface RouteCardProps {
  route: Route;
  fromAmount: string;
}

export function RouteCard({ route, fromAmount }: RouteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const inputNumber = parseFloat(fromAmount) || 0;
  const destinationToken = route.path[route.path.length - 1];

  return (
    <div className="border border-border-default bg-bg-surface overflow-hidden relative rounded-xl transition-all duration-200">
      {/* Decorative brass left-border accent */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-accent-gold" />

      <div className="p-4 sm:p-5 pl-5 sm:pl-6">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-3.5">
          <span className="font-serif italic text-xs text-text-secondary">Winning route</span>
          <Badge variant="success" className="font-sans font-bold">Best Price</Badge>
        </div>

        {/* Route Path Visualizer */}
        <div className="mb-4">
          <RoutePathPills path={route.path} />
        </div>

        {/* Primary Data Metric Columns */}
        <div className="grid grid-cols-3 gap-3 pt-3.5 border-t border-border-default bg-bg-surface">
          <div>
            <span className="font-serif italic text-xs text-text-secondary block mb-0.5">Expected output</span>
            <span className="font-mono text-sm sm:text-base font-semibold text-text-primary block whitespace-nowrap overflow-hidden text-ellipsis">
              {route.outputAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
            <span className="font-sans text-[11px] text-text-tertiary">{destinationToken.ticker}</span>
          </div>

          <div>
            <span className="font-serif italic text-xs text-text-secondary block mb-0.5">Route fee</span>
            <span className="font-mono text-sm sm:text-base font-semibold text-text-primary block">
              {route.feePercent.toFixed(2)}%
            </span>
            <span className="font-sans text-[11px] text-text-tertiary">Network inclusive</span>
          </div>

          <div>
            <span className="font-serif italic text-xs text-text-secondary block mb-0.5">Liquidity hops</span>
            <span className="font-mono text-sm sm:text-base font-semibold text-text-primary block flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-accent-gold" />
              {route.hops}
            </span>
            <span className="font-sans text-[11px] text-text-tertiary">
              {route.hops === 1 ? 'Direct Swap' : `${route.hops} pools`}
            </span>
          </div>
        </div>

        {/* Expand Details Trigger */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between mt-4.5 pt-2 border-t border-border-default/40 text-[11px] font-sans font-medium text-text-secondary hover:text-text-primary transition-colors focus:outline-none bg-bg-surface"
        >
          <span className="flex items-center gap-1.5 italic font-serif">
            <Info className="w-3 h-3 text-accent-gold" />
            {isExpanded ? 'Hide route path breakdown' : 'Show route path breakdown'}
          </span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Expanded Hops Breakdown Accordion */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-3 space-y-3.5 border-t border-border-default/60">
                <span className="block text-[11px] font-serif italic text-text-tertiary">Hops ledger & execution split</span>
                
                <div className="space-y-2">
                  {route.hopsDetails.map((hop, hIndex) => (
                    <div 
                      key={hIndex} 
                      className="p-3 bg-bg-base/50 rounded-lg border border-border-default/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="gold" className="text-[9px] px-1 ml-0.5">{hop.source}</Badge>
                        <span className="font-sans text-xs text-text-secondary whitespace-nowrap">
                          Swap {hop.fromToken.ticker} → {hop.toToken.ticker}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-x-4">
                        <div className="text-right">
                          <span className="font-serif italic text-[10px] text-text-tertiary block">Input / Output</span>
                          <span className="font-mono text-xs text-text-primary">
                            {hop.amountIn.toLocaleString(undefined, { maximumFractionDigits: 2 })} →{' '}
                            {hop.amountOut.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </span>
                        </div>
                        
                        <div className="text-right min-w-[50px]">
                          <span className="font-serif italic text-[10px] text-text-tertiary block">Split fee</span>
                          <span className="font-mono text-xs text-text-primary">
                            {hop.feePercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-bg-surface border border-border-default rounded-lg p-3 flex justify-between items-center text-xs">
                  <span className="font-serif italic text-text-secondary">Route signature fingerprint</span>
                  <span className="font-mono text-text-tertiary tracking-wider uppercase text-[11px]">
                    {route.fingerprint}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Alternative Routes List view ---
interface AlternativeRoutesListProps {
  routes: Route[];
  selectedRouteId: string | undefined;
  onSelectRoute: (route: Route) => void;
}

export function AlternativeRoutesList({ routes, selectedRouteId, onSelectRoute }: AlternativeRoutesListProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!routes || routes.length === 0) return null;

  return (
    <div className="border border-border-default rounded-xl bg-bg-surface/50 p-4 transition-all duration-200">
      
      {/* Drawer Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left focus:outline-none"
      >
        <span className="font-serif italic text-xs sm:text-sm text-text-secondary select-none flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-text-tertiary" />
          {routes.length} other route paths calculated
        </span>
        <div className="flex items-center gap-1 text-xs text-text-tertiary font-sans">
          <span>{isOpen ? 'Collapse' : 'Expand'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Accordion List Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3.5 space-y-2 bg-transparent">
              {routes.map((altRoute) => {
                const destination = altRoute.path[altRoute.path.length - 1];
                const isSelected = altRoute.id === selectedRouteId || selectedRouteId === 'route-win' && altRoute.id === 'route-win';
                
                // Price delta is always simulated negative vs victory route
                const deltaAmount = altRoute.outputAmount - (altRoute.outputAmount * 1.012); // subtle worst delta

                return (
                  <button
                    key={altRoute.id}
                    onClick={() => onSelectRoute(altRoute)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-150 ${
                      isSelected 
                        ? 'bg-border-default/30 border-accent-gold' 
                        : 'bg-bg-base/30 border-border-default hover:bg-border-default/15 hover:border-border-emphasis'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <RoutePathPills path={altRoute.path} size="sm" />
                      <span className="text-[10px] font-sans text-text-tertiary">
                        Sources: {altRoute.hopsDetails.map(h => h.source).join(' + ')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs sm:text-sm font-semibold text-text-primary block">
                        {altRoute.outputAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </span>
                      <span className="font-mono text-[10px] text-danger-rose block">
                        -{((1.12) - (altRoute.feePercent / 10)).toFixed(2)}% vs winning path
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
