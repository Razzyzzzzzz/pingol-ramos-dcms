/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Derived from the Pingol Ramos logo: deep clinical navy + lime green.
        navy: {
          50:  '#eef1fb',
          100: '#d8def5',
          200: '#b3c0ec',
          300: '#8598de',
          400: '#5a71cf',
          500: '#3a51bd',
          600: '#2c3e9e',
          700: '#22317e', // primary
          800: '#1c2867',
          900: '#172050',
        },
        lime: {
          50:  '#f2f9e9',
          100: '#e1f0cd',
          200: '#c8e4a2',
          300: '#a9d472',
          400: '#8cc44f',
          500: '#7cb342', // accent
          600: '#5f9130',
          700: '#4a7027',
          800: '#3c5a23',
          900: '#334d20',
        },
        ink: '#1a2233',
        muted: '#64748b',
        surface: '#ffffff',
        canvas: '#f3f5f9',
        line: '#e2e8f0',
      },
      fontFamily: {
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 32, 80, 0.04), 0 4px 16px rgba(23, 32, 80, 0.06)',
        pop: '0 8px 30px rgba(23, 32, 80, 0.12)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'scale-in': 'scale-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
};
