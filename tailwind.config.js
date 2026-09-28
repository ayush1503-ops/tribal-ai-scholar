/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          900: '#073B4C',
          800: '#0A4A5E',
          700: '#0F6B78',
          600: '#0E8A9A',
          500: '#1398AD',
          100: '#E6F6F8',
          50: '#F0FAFB',
        },
        sand: { 50: '#FDFCFB', 100: '#F9F6F0', 200: '#F0EBE0' },
        accent: { 700: '#5B3F91', 100: '#F0ECF8' },
        success: { 700: '#166534', 100: '#DCFCE7' },
        warning: { 700: '#92400E', 100: '#FEF3C7' },
        danger: { 700: '#B42318', 100: '#FEE4E2' },
        info: { 700: '#075985', 100: '#E0F2FE' },
        text: '#172B35',
        muted: '#52616B',
        border: '#E3E9ED',
        borderStrong: '#D7E0E5',
        surface: '#FFFFFF',
        canvas: '#F6F9FA',
        focus: '#155EEF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '24px',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(15,35,45,.06), 0 4px 16px rgba(15,35,45,.06)',
        card: '0 2px 8px rgba(15,35,45,.07), 0 8px 24px rgba(15,35,45,.06)',
        'card-hover': '0 4px 16px rgba(15,35,45,.09), 0 16px 32px rgba(15,35,45,.08)',
        floating: '0 8px 24px rgba(15,35,45,.12), 0 16px 48px rgba(15,35,45,.10)',
      },
      maxWidth: {
        content: '1280px',
        form: '800px',
      },
      animation: {
        'fade-in': 'fadeIn .5s ease-out',
        'float': 'float 6s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
