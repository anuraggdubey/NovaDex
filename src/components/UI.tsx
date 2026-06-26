/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

// --- Badge ---
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'gold';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const bgStyles = {
    neutral: 'bg-border-default/20 text-text-secondary border border-border-default/40',
    success: 'bg-success-green/12 text-success-green border border-success-green/20',
    warning: 'bg-warning-amber/12 text-warning-amber border border-warning-amber/20',
    danger: 'bg-danger-rose/12 text-danger-rose border border-danger-rose/20',
    gold: 'bg-accent-gold/12 text-accent-gold border border-accent-gold/20',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-sans font-medium uppercase tracking-wider ${bgStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

// --- Spinner ---
export function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 rounded-full border-2 border-border-default"></div>
      <div className="absolute inset-0 rounded-full border-2 border-accent-gold border-t-transparent animate-spin"></div>
    </div>
  );
}

// --- MetricCard ---
interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  className?: string;
}

export function MetricCard({ label, value, subValue, className = '' }: MetricCardProps) {
  return (
    <div className={`p-4 bg-bg-surface border border-border-default rounded-xl flex flex-col justify-between ${className}`}>
      <span className="font-serif italic text-xs text-text-secondary mb-1">{label}</span>
      <div className="flex flex-col">
        <span className="font-mono text-xl md:text-2xl font-semibold tracking-tight text-text-primary">
          {value}
        </span>
        {subValue && (
          <span className="text-[11px] font-sans text-text-tertiary mt-0.5">{subValue}</span>
        )}
      </div>
    </div>
  );
}

// --- PriceImpactBar ---
interface PriceImpactBarProps {
  percent: number;
}

export function PriceImpactBar({ percent }: PriceImpactBarProps) {
  // Fill color thresholds: < 1% sage, 1-3% warning, > 3% danger
  const getColor = () => {
    if (percent < 1.0) return 'bg-success-green';
    if (percent <= 3.0) return 'bg-warning-amber';
    return 'bg-danger-rose';
  };

  const getTextColor = () => {
    if (percent < 1.0) return 'text-success-green';
    if (percent <= 3.0) return 'text-warning-amber';
    return 'text-danger-rose';
  };

  const fillWidth = Math.min(100, Math.max(0, percent * 20)); // scale for visibility (e.g. 5% fills completely)

  return (
    <div className="space-y-1.5 py-1">
      <div className="flex justify-between items-center text-xs">
        <span className="font-sans text-text-secondary">Market price impact</span>
        <span className={`font-mono font-medium ${getTextColor()}`}>
          {percent === 0 ? '0.00%' : `${percent.toFixed(2)}%`}
        </span>
      </div>
      <div className="h-1 w-full bg-border-default rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getColor()}`}
          style={{ width: `${percent === 0 ? 0 : Math.max(4, fillWidth)}%` }}
        />
      </div>
    </div>
  );
}

// --- EmptyState ---
interface EmptyStateProps {
  title: string;
  description: string;
  btnLabel?: string;
  onBtnClick?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, btnLabel, onBtnClick, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border-default rounded-xl bg-bg-surface/30 min-h-[220px]">
      <div className="text-text-tertiary mb-3">
        {icon || <AlertCircle className="w-8 h-8 opacity-60" />}
      </div>
      <h3 className="font-serif text-lg text-text-primary font-medium mb-1">{title}</h3>
      <p className="font-sans text-sm text-text-secondary max-w-sm mb-4">{description}</p>
      {btnLabel && onBtnClick && (
        <button
          onClick={onBtnClick}
          className="px-4 py-2 border border-border-default hover:border-border-emphasis rounded-lg text-xs font-sans text-text-primary bg-bg-surface hover:text-text-primary transition-all duration-200"
        >
          {btnLabel}
        </button>
      )}
    </div>
  );
}

// --- FeatureCard (Landing Page grid items) ---
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({ icon, title, description, className = '' }: FeatureCardProps) {
  return (
    <div className={`p-6 bg-bg-surface border border-border-default rounded-xl transition-all duration-300 hover:border-border-emphasis flex flex-col justify-between ${className}`}>
      <div>
        <div className="text-accent-gold mb-4 inline-flex p-2 bg-bg-base/30 rounded-lg">
          {icon}
        </div>
        <h3 className="font-serif text-lg text-text-primary font-medium mb-2">{title}</h3>
        <p className="font-sans text-sm text-text-secondary leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// --- Accordion FAQ / Info item ---
interface AccordionItemProps {
  key?: string;
  question: string;
  answer: string;
}

export function AccordionItem({ question, answer }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border-default py-3.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left focus:outline-none"
      >
        <span className="font-serif text-[15px] sm:text-base text-text-primary font-medium hover:text-accent-gold transition-colors duration-150">
          {question}
        </span>
        <span className="text-text-tertiary ml-4 text-xs font-mono">
          {isOpen ? '[ - ]' : '[ + ]'}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pt-3 pb-1 font-sans text-sm text-text-secondary leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
