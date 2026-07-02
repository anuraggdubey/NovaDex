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
        'nd-bg': '#f2f2f2',
        'nd-surface': '#ffffff',
        'nd-raised': '#fafbfc',
        'nd-border': '#e2e5eb',
        'nd-ink': '#111318',
        'nd-secondary': '#3d4450',
        'nd-muted': '#6b7280',
        'nd-accent': '#1a3013',
        'nd-accent-soft': '#f3f8f0',
        'nd-lime': '#e4efd9',
        'nd-lime-soft': '#f2f8ee',
        'nd-lime-zone': '#eef6e9',
        'nd-lime-accent': '#dcebd2',
        'nd-lime-muted': '#f6faf3',
        'nd-forest': '#1a3013',
        'nd-mint-header': '#eef6e9',
        'nd-mint-deep': '#1a3013',
        'nd-card-border': '#e2e6ec',
        'nd-blue-header': '#f2f6fc',
        'nd-peach-header': '#fdf6f1',
        'nd-lavender-header': '#f6f3fc',
        'nd-positive': '#1a3013',
        'nd-warning': '#b45309',
        'nd-danger': '#c0394f',
        'nd-info': '#3d5a80',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'monospace'],
        serif: ['var(--font-serif)', 'Instrument Serif', 'Georgia', 'serif'],
        display: ['var(--font-serif)', 'Instrument Serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '24px',
        'card-lg': '28px',
        input: '12px',
        btn: '9999px',
      },
      boxShadow: {
        'nd-sm': '0 1px 3px rgba(17, 19, 24, 0.04)',
        'nd-md': '0 8px 30px rgba(17, 19, 24, 0.07), 0 2px 8px rgba(17, 19, 24, 0.04)',
        'nd-lg': '0 20px 50px rgba(17, 19, 24, 0.1)',
        'nd-nav': '0 4px 24px rgba(17, 19, 24, 0.08), 0 1px 2px rgba(17, 19, 24, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
