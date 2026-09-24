/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          DEFAULT: '#D32F2F',
          dark: '#B71C1C',
        },
        site: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#94A3B8',
          text: '#0F172A',
          muted: '#64748B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Nexa', '"Nexa Heavy"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        title: ['Nexa', '"Nexa Heavy"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        nexa: ['Nexa', '"Nexa Heavy"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'md': '5px',
        'lg': '5px',
        'xl': '5px',
        '2xl': '5px',
        '3xl': '5px',
      }
    },
  },
  plugins: [],
}
