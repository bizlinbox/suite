/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6ebf2',
          100: '#c2cfe0',
          200: '#99aec8',
          300: '#708db0',
          400: '#4b6f9a',
          500: '#2d5686',
          600: '#002d62',
          700: '#002655',
          800: '#001e47',
          900: '#00163a',
        },
        secondary: {
          50: '#e3f5f2',
          100: '#c2ebe5',
          200: '#9fdcd4',
          300: '#7ccdc3',
          400: '#5cbfb3',
          500: '#148b7d',
          600: '#117a6e',
          700: '#0e695f',
        },
        tertiary: {
          50: '#f4faf9',
          100: '#e8f4f2',
          200: '#d1e9e5',
          300: '#badeb8',
        },
        whatsapp: {
          bg: '#e8f4f2',
          bubble: '#e8f4f2',
          dark: '#002d62',
          teal: '#148b7d',
          green: '#002d62',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
