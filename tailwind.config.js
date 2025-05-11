/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.html",
    "./static/src/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        background: '#F3F4F6',
        'dark-bg': '#1F2937'
      }
    }
  },
  plugins: [],
  darkMode: 'class'
} 