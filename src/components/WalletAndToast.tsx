/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, LogOut, Copy, ExternalLink,
  CheckCircle, AlertCircle, Info, X, ShieldCheck
} from 'lucide-react';
import { useWalletStore, useToastStore, Toast } from '../store';
import { Token, Route } from '../types';
import { TokenIcon } from './TokenComponents';
import { Badge } from './UI';

// --- WalletButton ---
export function WalletButton() {
  const { publicKey, xlmBalance, provider, connect, disconnect, toggleNetwork, network } = useWalletStore();
  const { addToast } = useToastStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [connectDropdownOpen, setConnectDropdownOpen] = useState(false);

  const handleConnect = (selectedProvider: 'freighter' | 'albedo') => {
    setConnectDropdownOpen(false);
    connect(selectedProvider);
  };

  const handleCopy = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey);
    addToast('Address copied to clipboard', 'success');
    setDropdownOpen(false);
  };

  const handleDisconnect = () => {
    disconnect();
    setDropdownOpen(false);
  };

  if (!publicKey) {
    return (
      <div className="relative">
        <button
          onClick={() => setConnectDropdownOpen(!connectDropdownOpen)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#C9A876] hover:bg-[#D4B888] text-[#1A1D17] rounded-lg text-xs font-sans font-medium hover:text-[#1A1D17] transition-all duration-150 shadow-sm"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Connect Wallet</span>
        </button>

        {connectDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setConnectDropdownOpen(false)} />
            <div className="absolute right-0 mt-2 w-40 bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-3 duration-150">
              <div className="p-3 bg-bg-base/40 border-b border-border-default">
                <span className="text-[11px] font-sans text-text-secondary leading-none">Select a Wallet</span>
              </div>
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => handleConnect('freighter')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-border-default/25 rounded-md transition-all font-sans"
                >
                  <span className="font-semibold text-text-primary">Freighter</span>
                </button>
                <button
                  onClick={() => handleConnect('albedo')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-border-default/25 rounded-md transition-all font-sans"
                >
                  <span className="font-semibold text-text-primary">Albedo</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  const shortKey = `${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`;
  const providerName = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Wallet';

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 bg-bg-surface border border-border-default rounded-lg pl-3 pr-2 py-1">
        {/* Balance Display */}
        <div className="flex flex-col items-end pr-2 border-r border-border-default/60">
          <span className="font-mono text-xs font-semibold text-text-primary">
            {xlmBalance.toFixed(2)}
          </span>
          <span className="text-[10px] font-sans text-text-tertiary">XLM</span>
        </div>

        {/* Address and dropdown trigger toggle */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 pl-1.5 text-xs text-text-primary hover:text-accent-gold font-mono focus:outline-none bg-bg-surface"
        >
          <span>{shortKey}</span>
          <span className="text-[10px] text-text-tertiary select-none">▼</span>
        </button>
      </div>

      {/* Popover Card dropdown */}
      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-3 duration-150">
            <div className="p-3 bg-bg-base/40 border-b border-border-default flex items-center justify-between">
              <span className="text-[11px] font-sans text-text-secondary leading-none">{providerName} Connected</span>
              <Badge variant={network === 'mainnet' ? 'gold' : 'neutral'} className="text-[9px]">
                {network}
              </Badge>
            </div>

            <div className="p-1.5 space-y-0.5">
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-border-default/25 rounded-md transition-all font-sans"
              >
                <Copy className="w-3.5 h-3.5 text-text-tertiary" />
                <span>Copy address</span>
              </button>

              <a
                href={`https://stellar.expert/explorer/${network}/account/${publicKey}`}
                target="_blank"
                rel="noreferrer referrer"
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-border-default/25 rounded-md transition-all font-sans"
              >
                <ExternalLink className="w-3.5 h-3.5 text-text-tertiary" />
                <span>Stellar Expert ↗</span>
              </a>

              <button
                onClick={toggleNetwork}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-border-default/25 rounded-md transition-all font-sans"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-text-tertiary" />
                <span>Toggle Network</span>
              </button>

              <div className="h-[0.5px] bg-border-default/80 my-1" />

              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-danger-rose hover:bg-danger-rose/10 rounded-md transition-all font-sans"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- ToastList (Notification popups) ---
export function ToastList() {
  const { toasts, removeToast } = useToastStore();

  const iconOf = (type: Toast['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-success-green shrink-0" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-danger-rose shrink-0" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-warning-amber shrink-0" />;
      default: return <Info className="w-4 h-4 text-accent-gold shrink-0" />;
    }
  };

  const borderOf = (type: Toast['type']) => {
    switch (type) {
      case 'success': return 'border-l-4 border-l-success-green';
      case 'error': return 'border-l-4 border-l-danger-rose';
      case 'warning': return 'border-l-4 border-l-warning-amber';
      default: return 'border-l-4 border-l-[#C9A876]';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[340px] pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 30, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            className={`pointer-events-auto flex items-start gap-2.5 p-3.5 bg-bg-surface border border-border-default rounded-md shadow-2xl ${borderOf(t.type)}`}
          >
            {iconOf(t.type)}
            <div className="flex-1">
              <span className="font-sans text-xs text-text-primary leading-tight font-medium">
                {t.message}
              </span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-text-tertiary hover:text-text-primary transition-colors focus:outline-none bg-bg-surface shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// --- SuccessCard (Post Swap completion view) ---
interface SuccessCardProps {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  savedAmount: number;
  txHash: string;
  onReset: () => void;
}

export function SuccessCard({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  savedAmount,
  txHash,
  onReset,
}: SuccessCardProps) {
  const shortHash = `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}`;

  return (
    <div className="p-6 bg-bg-surface border border-border-default rounded-xl max-w-[480px] w-full mx-auto text-center animate-in fade-in duration-200">
      <div className="w-12 h-12 rounded-full bg-success-green/12 border border-success-green/30 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-6 h-6 text-success-green" />
      </div>

      <h2 className="font-serif text-xl text-text-primary font-medium mb-1">Swap complete</h2>
      <p className="font-sans text-xs text-text-secondary max-w-sm mx-auto mb-6">
        Atomic trade routing executed successfully on the Stellar ledger via Soroban transaction oracle.
      </p>

      {/* Trade Recap panel */}
      <div className="bg-bg-base/40 rounded-lg p-4 border border-border-default/40 space-y-3.5 mb-6 text-left">
        <div className="flex justify-between items-center text-xs">
          <span className="font-serif italic text-text-secondary">Amount paid</span>
          <span className="font-mono font-medium text-text-primary text-sm">
            {parseFloat(fromAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })} {fromToken.ticker}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="font-serif italic text-text-secondary">Amount received</span>
          <span className="font-mono font-bold text-success-green text-sm">
            +{parseFloat(toAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })} {toToken.ticker}
          </span>
        </div>

        {savedAmount > 0 && (
          <div className="flex justify-between items-center text-xs pt-2.5 border-t border-border-default/30">
            <span className="font-serif italic text-text-secondary">Arbitrage savings achieved</span>
            <span className="font-mono font-semibold text-accent-gold">
              +{savedAmount.toFixed(4)} {toToken.ticker}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center text-xs pt-2.5 border-t border-border-default/30">
          <span className="font-serif italic text-text-secondary">Transaction hash</span>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noreferrer referrer"
            className="font-mono text-xs text-accent-gold hover:underline flex items-center gap-1"
          >
            {shortHash}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={onReset}
          className="w-full py-3 bg-[#C9A876] hover:bg-[#D4B888] text-[#1A1D17] rounded-lg text-sm font-sans font-semibold transition-all duration-150"
        >
          Make another swap
        </button>
      </div>
    </div>
  );
}

// --- ConfirmationModal ---
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  route: Route | null;
  slippagePercent: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  fromToken,
  toToken,
  fromAmount,
  route,
  slippagePercent,
}: ConfirmationModalProps) {
  const [isSigning, setIsSigning] = useState(false);

  if (!isOpen || !route) return null;

  const handleConfirm = () => {
    setIsSigning(true);
    // Simulate real ledger verification and signing delay
    setTimeout(() => {
      setIsSigning(false);
      onConfirm();
    }, 1800);
  };

  const minimumReceived = route.outputAmount * (1 - parseFloat(slippagePercent) / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#1A1D17]/85 backdrop-blur-sm"
        onClick={() => { if (!isSigning) onClose(); }}
      />

      {/* Dialog box */}
      <div className="relative w-full max-w-[440px] bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-border-default bg-bg-surface flex justify-between items-center">
          <h3 className="font-serif text-lg text-text-primary font-medium">Review intent routing</h3>
          {!isSigning && (
            <button 
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary p-1 border border-transparent hover:border-border-default rounded-sm transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content body */}
        <div className="p-5 space-y-4 bg-bg-surface">
          
          {/* Swap visual summary */}
          <div className="flex items-center justify-between p-3.5 bg-bg-base/40 rounded-lg border border-border-default/40">
            <div className="flex items-center gap-2">
              <TokenIcon token={fromToken} size={28} />
              <div>
                <span className="font-mono text-xs text-text-tertiary block leading-none">From</span>
                <span className="font-mono text-sm font-semibold text-text-primary">
                  {parseFloat(fromAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })} {fromToken.ticker}
                </span>
              </div>
            </div>

            <div className="h-[20px] w-[1px] bg-border-default" />

            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="font-mono text-xs text-text-tertiary block leading-none">To</span>
                <span className="font-mono text-sm font-bold text-success-green">
                  +{route.outputAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {toToken.ticker}
                </span>
              </div>
              <TokenIcon token={toToken} size={28} />
            </div>
          </div>

          {/* Ledger parameters list */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="font-serif italic text-text-secondary">Execution route</span>
              <span className="font-mono text-text-primary text-[10.5px]">
                {route.path.map(t => t.ticker).join(' → ')}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-t border-border-default/35">
              <span className="font-serif italic text-text-secondary">Minimum guaranteed output</span>
              <span className="font-mono text-text-primary">
                {minimumReceived.toFixed(4)} {toToken.ticker}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-t border-border-default/35">
              <span className="font-serif italic text-text-secondary">Market price impact</span>
              <span className={`font-mono ${route.priceImpactPercent > 3.0 ? 'text-danger-rose' : 'text-text-primary'}`}>
                {route.priceImpactPercent === 0 ? '0.00%' : `${route.priceImpactPercent.toFixed(2)}%`}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-t border-border-default/35">
              <span className="font-serif italic text-text-secondary">Slippage parameter allowance</span>
              <span className="font-mono text-text-primary">
                {slippagePercent}%
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-t border-border-default/35">
              <span className="font-serif italic text-text-secondary">Simulated gas network fee</span>
              <span className="font-mono text-text-primary">
                ~ 0.00012 XLM
              </span>
            </div>

            {route.savedAmount > 0 && (
              <div className="flex justify-between items-center py-1.5 p-2 bg-success-green/5 border border-success-green/20 rounded-md font-sans mt-1">
                <span className="text-success-green font-medium flex items-center gap-1 font-serif italic text-xs">
                  <Info className="w-3.5 h-3.5 text-success-green shrink-0" />
                  Your optimized trade value saved
                </span>
                <span className="font-mono text-success-green font-semibold">
                  {route.savedAmount.toFixed(4)} {toToken.ticker}
                </span>
              </div>
            )}
          </div>

          <div className="h-[0.5px] bg-border-default my-4" />

          {/* Prompt warning action button */}
          <div className="space-y-2">
            <button
              onClick={handleConfirm}
              disabled={isSigning}
              className="w-full py-3 bg-[#C9A876] hover:bg-[#D4B888] disabled:bg-[#3A3D33] text-[#1A1D17] disabled:text-text-tertiary rounded-lg text-sm font-sans font-semibold transition-all duration-150 flex items-center justify-center gap-2"
            >
              {isSigning ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#1A1D17] border-t-transparent rounded-full animate-spin" />
                  <span>Approving on Freighter...</span>
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  <span>Submit order via Soroban</span>
                </>
              )}
            </button>
            
            {!isSigning && (
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-transparent border border-border-default hover:border-border-emphasis text-text-secondary hover:text-text-primary rounded-lg text-xs font-sans transition-all duration-150"
              >
                Cancel transaction
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
