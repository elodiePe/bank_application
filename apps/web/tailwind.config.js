/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bed0fd',
          300: '#91b1fb',
          400: '#5c87f7',
          500: '#3862f0',
          600: '#2544e4',
          700: '#1f34c9',
          800: '#202da3',
          900: '#1f2a80',
        },
      },
    },
  },
  plugins: [],
};
