/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        travel: {
          primary: {
            DEFAULT: '#0284c7', // Ocean Blue
            hover: '#0369a1',
            light: '#e0f2fe',
          },
          secondary: {
            DEFAULT: '#0d9488', // Teal / Emerald
            hover: '#0f766e',
            light: '#ccfbf1',
          },
          accent: {
            DEFAULT: '#f97316', // Sunset Orange (high-priority CTAs)
            hover: '#ea580c',
            light: '#ffedd5',
          },
          highlight: {
            DEFAULT: '#f59e0b', // Golden Amber
            light: '#fef3c7',
          },
          surface: {
            DEFAULT: '#ffffff',
            subtle: '#f1f5f9',
            border: '#e2e8f0',
          },
          text: {
            main: '#0f172a',
            muted: '#64748b',
            light: '#94a3b8',
          },
          transport: {
            walk: '#059669',
            bus: '#0284c7',
            auto: '#d97706',
            cab: '#7c3aed',
          },
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'travel-card': '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
        'travel-card-hover': '0 12px 28px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
}
