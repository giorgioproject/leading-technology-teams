import type { Config } from 'tailwindcss';

/**
 * Design tokens for CommonGround.
 * Dark-mode companions use the `-dark` / `bright` / `soft-dark` keys and are
 * applied with Tailwind `dark:` classes (media strategy, follows the system).
 * Member colors follow the Okabe–Ito palette. The eighth swatch is gray
 * instead of black so it stays visible on both paper and dark backgrounds.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1F2937',
          dark: '#F4F1EA',
        },
        muted: {
          DEFAULT: '#6B7280',
          dark: '#A3AAA6',
        },
        paper: {
          DEFAULT: '#FAFAF7',
          dark: '#121614',
        },
        card: {
          DEFAULT: '#FFFFFF',
          dark: '#1C2420',
        },
        line: {
          DEFAULT: '#E5E7EB',
          dark: '#31403B',
        },
        primary: {
          DEFAULT: '#2F5D50',
          hover: '#244A40',
          soft: '#E6EFEC',
          bright: '#8FBFB0',
          'soft-dark': '#1A2E29',
        },
        accent: {
          DEFAULT: '#D98E4A',
          /** Darker amber for text and icons. The brand amber fails contrast on paper. */
          ink: '#815012',
          soft: '#F8EFE4',
          bright: '#E0A36A',
          'soft-dark': '#2C241C',
        },
        good: {
          DEFAULT: '#3F8F5B',
          /** Darker green for text on paper and soft fills. */
          ink: '#2C6B40',
          soft: '#E5F2EA',
          bright: '#6FBF8A',
          'soft-dark': '#163024',
        },
        warn: {
          DEFAULT: '#C9842B',
          /** Darker amber for text. The brand warn color fails contrast as small type. */
          ink: '#815012',
          soft: '#F8F0E4',
          bright: '#E0A85A',
          'soft-dark': '#2C2418',
        },
        alert: {
          DEFAULT: '#B54A3C',
          /** Darker red for text on the soft alert fill. */
          ink: '#9A3E32',
          soft: '#F8E8E6',
          bright: '#E08A7E',
          'soft-dark': '#2E1C19',
        },
        member: {
          1: '#0072B2',
          2: '#E69F00',
          3: '#009E73',
          4: '#D55E00',
          5: '#CC79A7',
          6: '#56B4E9',
          7: '#F0E442',
          8: '#6E6E6E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      maxWidth: {
        content: '1100px',
      },
    },
  },
  plugins: [],
};

export default config;
