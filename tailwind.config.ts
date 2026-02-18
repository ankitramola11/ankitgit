import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        instrument: {
          bg: '#f5f6f7',
          panel: '#fbfbfc',
          line: '#d7d9de',
          ink: '#111827',
          muted: '#5f6776',
          accent: '#374151'
        }
      }
    }
  },
  plugins: []
};

export default config;
