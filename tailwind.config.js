/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'card-enter': 'card-stack-enter 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'avatar-pulse': 'avatar-pulse 3s ease-in-out infinite',
        'char-reveal': 'char-reveal 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'scroll-reveal': 'scroll-reveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
      boxShadow: {
        'brutalist': '4px 4px 0px rgba(84, 179, 214, 0.2)',
        'brutalist-lg': '6px 6px 0px rgba(84, 179, 214, 0.25)',
        'brutalist-accent': '4px 4px 0px rgba(84, 179, 214, 0.4)',
        'brutalist-hover': '8px 8px 0px rgba(84, 179, 214, 0.3)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
