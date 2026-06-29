import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // NovaDEX Design System - from documentation Section 11
        'bg-base': '#0A0F1E',
        'bg-surface': '#111827',
        'bg-elevated': '#1F2937',
        'border-default': '#1F2937',
        'border-light': '#374151',
        'accent': '#818CF8',
        'accent-dark': '#6366F1',
        'accent-bg': '#1E1B4B',
        'teal': '#2DD4BF',
        'success-green': '#34D399',
        'warning-amber': '#FBBF24',
        'danger-rose': '#F87171',
        'text-primary': '#F9FAFB',
        'text-secondary': '#9CA3AF',
        'text-muted': '#6B7280',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-instrument-serif)', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'card': '16px',
        'input': '10px',
        'btn': '10px',
      },
    },
  },
  plugins: [],
};

export default config;
