import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#080c10',
          2: '#0d1219',
          3: '#121820',
        },
        surface: {
          DEFAULT: '#161d27',
          2: '#1c2533',
        },
        border: {
          DEFAULT: '#1e2d3d',
          2: '#263547',
        },
        px: {
          cyan:   '#00d4ff',
          orange: '#ff6b35',
          purple: '#a855f7',
          green:  '#10b981',
          danger: '#ff4757',
          warn:   '#ffa502',
          ok:     '#2ed573',
          muted:  '#5a7a96',
          muted2: '#3d5a75',
        },
      },
      fontFamily: {
        mono: ['Space Mono', 'monospace'],
        sans: ['Syne', 'sans-serif'],
      },
      animation: {
        'sweep': 'sweep 1.2s infinite linear',
        'pulse-slow': 'pulse 2s infinite',
        'count-up': 'countUp .6s ease-out forwards',
        'fade-in': 'fadeIn .4s ease-out forwards',
        'slide-up': 'slideUp .4s ease-out forwards',
      },
      keyframes: {
        sweep: {
          '0%':   { left: '-60%' },
          '100%': { left: '140%' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
