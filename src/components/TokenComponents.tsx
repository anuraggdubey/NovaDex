/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import { Token } from '../types';
import { TOKENS } from '../data';
import { useWalletStore } from '../store';

// --- TokenIcon ---
interface TokenIconProps {
  token: Token;
  size?: number;
}

export function TokenIcon({ token, size = 32 }: TokenIconProps) {
  // Editorial clean ledger style: round emblem, filled with dark brass border,
  // first letter inside in monospace typography. No fancy neon gradients.
  const tickerChar = token.ticker.charAt(0);
  
  // Custom subtle color hues to distinguish assets elegantly
  const getColors = () => {
    switch (token.ticker) {
      case 'XLM': return 'bg-border-default/80 text-text-primary border border-text-primary/10';
      case 'USDC': return 'bg-[#1e2e3a] text-sky-300 border border-sky-500/20';
      case 'AQUA': return 'bg-[#153422] text-success-green border border-success-green/20';
      case 'yXLM': return 'bg-[#3b2e1b] text-accent-gold border border-accent-gold/20';
      case 'ARS': return 'bg-[#3a1b32] text-fuchsia-300 border border-fuchsia-500/10';
      case 'SHX': return 'bg-[#21213a] text-purple-300 border border-purple-500/10';
      default: return 'bg-border-default text-text-secondary';
    }
  };

  return (
    <div
      className={`rounded-full flex items-center justify-center font-mono font-bold select-none shrink-0 ${getColors()}`}
      style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.44)}px` }}
    >
      {tickerChar}
    </div>
  );
}

// --- TokenSelectModal ---
interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  selectedToken: Token;
}

export function TokenSelectModal({ isOpen, onClose, onSelect, selectedToken }: TokenSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { publicKey, balances } = useWalletStore();

  if (!isOpen) return null;

  const filteredTokens = TOKENS.filter((t) => {
    const query = searchQuery.toLowerCase();
    return t.ticker.toLowerCase().includes(query) || t.name.toLowerCase().includes(query);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#1A1D17]/85 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Box */}
      <div className="relative w-full max-w-[440px] bg-bg-surface border border-border-default rounded-xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-border-default flex justify-between items-center bg-bg-surface">
          <h3 className="font-serif text-lg text-text-primary font-medium">Select an asset</h3>
          <button 
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1 border border-transparent hover:border-border-default rounded-sm transition-all duration-155"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border-default bg-bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by ticker or asset name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-bg-base border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-gold font-sans"
              autoFocus
            />
          </div>
        </div>

        {/* Tokens List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 bg-bg-surface">
          {filteredTokens.length === 0 ? (
            <div className="py-12 text-center">
              <span className="font-serif italic text-sm text-text-secondary">No assets found</span>
              <p className="font-sans text-xs text-text-tertiary mt-1">Try searching with a different keyword</p>
            </div>
          ) : (
            filteredTokens.map((token) => {
              const isSelected = token.id === selectedToken.id;
              const assetBalance = publicKey ? (balances[token.id] ?? 0) : 0;

              return (
                <button
                  key={token.id}
                  onClick={() => {
                    onSelect(token);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-150 group ${
                    isSelected 
                      ? 'bg-border-default/40 border border-border-default/80' 
                      : 'hover:bg-border-default/20 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TokenIcon token={token} size={36} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-semibold text-text-primary group-hover:text-accent-gold transition-colors duration-150">
                          {token.ticker}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-accent-gold" />}
                      </div>
                      <span className="font-sans text-xs text-text-secondary leading-none">
                        {token.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    {publicKey ? (
                      <span className="font-mono text-xs text-text-primary">
                        {assetBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </span>
                    ) : (
                      <span className="font-sans text-[11px] text-text-tertiary">--</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// --- TokenSelector (inline trigger button) ---
interface TokenSelectorProps {
  token: Token;
  onSelect: (token: Token) => void;
}

export function TokenSelector({ token, onSelect }: TokenSelectorProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface border border-border-default hover:border-border-emphasis rounded-lg text-text-primary hover:text-text-primary transition-all duration-150 shadow-sm"
      >
        <TokenIcon token={token} size={20} />
        <span className="font-mono text-xs font-semibold tracking-wider">{token.ticker}</span>
        <span className="text-[10px] text-text-tertiary">▼</span>
      </button>

      <TokenSelectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={onSelect}
        selectedToken={token}
      />
    </>
  );
}
