/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ivory: '#FAF7F0',
        forest: '#173F35',
        sage: '#B8C9AF',
        amber: '#E8AD63',
        charcoal: '#292D2B',
        mist: '#E8E3D9',
      },
      borderRadius: {
        '4xl': '32px',
      },
    },
  },
  plugins: [],
};
