/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Pretendard',
          'Pretendard Variable',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          50: '#f2f2ff',
          100: '#e6e6ff',
          200: '#d0d0ff',
          300: '#b0adff',
          400: '#8b82ff',
          500: '#6c5cff',
          600: '#5a3df5',
          700: '#4c2bd8',
          800: '#3f25ae',
          900: '#35238a',
          950: '#20124f',
        },
        mint: {
          400: '#3ddc97',
          500: '#22c98a',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px -12px rgba(16, 24, 40, 0.12)',
        float: '0 12px 40px -12px rgba(60, 40, 160, 0.35)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'sheet-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.85)' },
          '60%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'sheet-up': 'sheet-up 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        'sheet-right': 'sheet-right 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        pop: 'pop 280ms ease-out',
      },
    },
  },
  plugins: [],
};
