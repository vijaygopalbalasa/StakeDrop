/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neo Brutalism primary palette
        brutal: {
          black: '#000000',
          white: '#FFFDF7',
          cream: '#FEF3E2',
          paper: '#FAFAF5',
        },
        // Accent colors - bold and playful
        accent: {
          yellow: '#FFE566',
          orange: '#FF8A47',
          pink: '#FF6B9D',
          purple: '#A855F7',
          blue: '#3B82F6',
          cyan: '#22D3EE',
          green: '#4ADE80',
          lime: '#A3E635',
        },
        // Cardano brand colors
        cardano: {
          primary: '#0033AD',
          light: '#3366FF',
          dark: '#001F66',
        },
        // Midnight brand colors
        midnight: {
          primary: '#6366F1',
          light: '#818CF8',
          dark: '#4338CA',
        },
      },
      // Bold Neo Brutalism shadows
      boxShadow: {
        'brutal': '4px 4px 0 0 #000000',
        'brutal-sm': '2px 2px 0 0 #000000',
        'brutal-md': '6px 6px 0 0 #000000',
        'brutal-lg': '8px 8px 0 0 #000000',
        'brutal-xl': '12px 12px 0 0 #000000',
        'brutal-hover': '6px 6px 0 0 #000000',
        'brutal-active': '2px 2px 0 0 #000000',
        // Colored shadows
        'brutal-yellow': '4px 4px 0 0 #FFE566',
        'brutal-pink': '4px 4px 0 0 #FF6B9D',
        'brutal-blue': '4px 4px 0 0 #3B82F6',
        'brutal-green': '4px 4px 0 0 #4ADE80',
        'brutal-purple': '4px 4px 0 0 #A855F7',
      },
      // Bold borders
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '5': '5px',
        '6': '6px',
      },
      // Chunky fonts
      fontFamily: {
        'display': ['Space Grotesk', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      // Animations
      animation: {
        'bounce-brutal': 'bounce-brutal 0.5s ease-in-out',
        'shake': 'shake 0.5s ease-in-out',
        'pop': 'pop 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-down': 'slide-down 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'bounce-brutal': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      // Spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
};
