/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d0d1a',
        primary: '#b6a0ff',
        secondary: '#00affe',
        surface: '#0d0d1a',
        'surface-container-low': '#121220',
        'surface-container-high': '#1e1e2f',
        'surface-container-highest': '#242437',
        'surface-variant': 'rgba(36, 36, 55, 0.4)',
        'on-surface': '#e9e6f9',
        'on-surface-variant': '#aba9bb',
        tertiary: '#e966ff',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 15px rgba(126, 81, 255, 0.4)',
        'ambient': '0 20px 50px rgba(182, 160, 255, 0.08)',
      }
    },
  },
  plugins: [],
};