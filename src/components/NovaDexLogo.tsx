'use client';

import React from 'react';

interface NovaDexLogoProps {
  size?: number;
  className?: string;
}

/**
 * NovaDEX Logo Mark — v2
 *
 * A geometric monogram built from the letter "N" stylised as two
 * vertical pillars linked by a diagonal route-slash:
 *
 *   ┃╲      ┃
 *   ┃  ╲    ┃
 *   ┃    ╲  ┃
 *   ┃      ╲┃
 *
 * The diagonal simultaneously reads as a swap-route arrow and the
 * descender of the letter "N". A small emerald diamond at the
 * crossing point represents the optimal routing nucleus — the "Nova".
 *
 * Palette: emerald-500 → emerald-400 gradient (matching the site accent).
 */
export const NovaDexLogo: React.FC<NovaDexLogoProps> = ({ size = 28, className = '' }) => {
  // Unique gradient IDs to avoid SVG conflicts when multiple logos render
  const id = React.useId?.() ?? 'nd';
  const gradId = `ndGrad-${id}`;
  const glowId = `ndGlow-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="NovaDEX logo"
    >
      <defs>
        {/* Main emerald gradient */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1f5c4d" />
          <stop offset="50%" stopColor="#2d6a5a" />
          <stop offset="100%" stopColor="#5a8f7e" />
        </linearGradient>

        {/* Subtle glow filter for the accent diamond */}
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Outer rounded-square container ── */}
      <rect
        x="1" y="1" width="34" height="34" rx="8"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="1.6"
        opacity="0.35"
      />

      {/* ── Left vertical bar of the "N" ── */}
      <rect
        x="8" y="8" width="3.6" height="20" rx="1.8"
        fill={`url(#${gradId})`}
      />

      {/* ── Right vertical bar of the "N" ── */}
      <rect
        x="24.4" y="8" width="3.6" height="20" rx="1.8"
        fill={`url(#${gradId})`}
      />

      {/* ── Diagonal slash connecting the two bars (the swap route) ── */}
      <line
        x1="10.5" y1="9"
        x2="25.5" y2="27"
        stroke={`url(#${gradId})`}
        strokeWidth="3.4"
        strokeLinecap="round"
      />

      {/* ── Accent diamond — the "Nova" routing nucleus ── */}
      <g filter={`url(#${glowId})`}>
        <path
          d="M18 14.5 L20.2 18 L18 21.5 L15.8 18 Z"
          fill="#5a8f7e"
        />
      </g>

      {/* ── Bright centre dot ── */}
      <circle cx="18" cy="18" r="1.2" fill="white" opacity="0.85" />
    </svg>
  );
};

/**
 * NovaDEX Brand lockup — logo mark + wordmark.
 *
 * The text treatment uses weight contrast:
 *   "Nova" → extra-bold (the powerful router)
 *   "DEX"  → medium weight, emerald accent (the exchange layer)
 *   "."    → emerald signature dot
 */
export const NovaDexBrand: React.FC<{
  size?: number;
  textSize?: string;
  className?: string;
}> = ({ size = 28, textSize = 'text-xl', className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <NovaDexLogo size={size} />
      <span className={`${textSize} tracking-tight text-nd-ink`}>
        <span className="font-bold">Nova</span>
        <span className="font-semibold text-nd-accent">DEX</span>
      </span>
    </span>
  );
};

export default NovaDexLogo;
