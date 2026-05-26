/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          light: '#f8fafc',
          dark: '#0b0f19'
        },
        card: {
          light: '#ffffff',
          dark: '#161e31'
        }
      }
    },
  },
  plugins: [],
}
