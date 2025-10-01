/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'profit': '#00ff88',
        'loss': '#ff4757',
        'neutral': '#9ca3af',
        'bg-dark': '#1a1a1a',
        'card-dark': '#2d2d2d',
        'border-dark': '#404040',
      },
      fontFamily: {
        'mono': ['Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', 'monospace'],
      }
    },
  },
  plugins: [],
}
