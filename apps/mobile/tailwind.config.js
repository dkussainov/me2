/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './constants/**/*.{ts,tsx}',
    './db/**/*.{ts,tsx}',
    './stores/**/*.{ts,tsx}',
    './queries/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        priority: {
          p1: '#ef4444',
          p2: '#f97316',
          p3: '#3b82f6',
          p4: '#71717a',
        },
      },
    },
  },
  plugins: [],
};
