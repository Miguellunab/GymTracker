/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        display: ['var(--font-outfit)'],
      },
      colors: {
        dark: {
          bg: '#0a0a0a',
          card: '#161616',
          border: 'rgba(255, 255, 255, 0.06)',
        },
        accent: {
          green: '#00C853',
          'green-dim': 'rgba(0, 200, 83, 0.15)',
          blue: '#2196F3',
          'blue-dim': 'rgba(33, 150, 243, 0.15)',
        }
      },
    },
  },
  plugins: [],
};
