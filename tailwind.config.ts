import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body:    ['var(--font-body)',    'sans-serif'],
      },
      colors: {
        glass: {
          white: 'rgba(255,255,255,0.06)',
          border: 'rgba(255,255,255,0.12)',
          hover: 'rgba(255,255,255,0.10)',
        },
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          purple: '#8b5cf6',
          pink:   '#ec4899',
          cyan:   '#06b6d4',
          emerald:'#10b981',
          amber:  '#f59e0b',
          rose:   '#f43f5e',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-gradient': `
          radial-gradient(at 40% 20%, rgba(99,102,241,0.3) 0px, transparent 50%),
          radial-gradient(at 80% 0%, rgba(139,92,246,0.2) 0px, transparent 50%),
          radial-gradient(at 0% 50%, rgba(6,182,212,0.15) 0px, transparent 50%),
          radial-gradient(at 80% 50%, rgba(236,72,153,0.1) 0px, transparent 50%),
          radial-gradient(at 0% 100%, rgba(99,102,241,0.2) 0px, transparent 50%)
        `,
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
