/** @type {import('tailwindcss').Config} */
// Product utility names (fg/bg/accent) map to @singleton-sd/tokens --ssd-* vars.
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        fg: {
          DEFAULT: 'var(--ssd-color-text-default)',
          muted: 'var(--ssd-color-text-muted)',
          subtle: 'var(--ssd-color-text-subtle)',
          inverse: 'var(--ssd-color-text-inverse)',
          brand: 'var(--ssd-color-text-brand)',
        },
        bg: {
          DEFAULT: 'var(--ssd-color-background-default)',
          muted: 'var(--ssd-color-background-muted)',
          subtle: 'var(--ssd-color-background-subtle)',
          inverse: 'var(--ssd-color-background-inverse)',
          hero: 'var(--mkt-color-background-hero)',
          elevated: 'var(--ssd-color-background-subtle)',
        },
        accent: {
          DEFAULT: 'var(--ssd-color-background-brand)',
          hover: 'var(--ssd-color-background-brand-hovered)',
          muted: 'var(--mkt-color-background-brand-muted)',
          on: 'var(--ssd-color-text-on-brand)',
          bg: 'var(--mkt-color-background-brand-muted)',
        },
        border: {
          DEFAULT: 'var(--ssd-color-border-default)',
          muted: 'var(--ssd-color-border-muted)',
          strong: 'var(--ssd-color-border-strong)',
        },
        status: {
          error: 'var(--ssd-color-feedback-danger-text)',
          'error-bg': 'var(--ssd-color-feedback-danger-background)',
          success: 'var(--ssd-color-feedback-success-text)',
          'success-bg': 'var(--ssd-color-feedback-success-background)',
        },
      },
      fontFamily: {
        heading: 'var(--ssd-font-family-heading)',
        body: 'var(--ssd-font-family-body)',
      },
      fontSize: {
        display: ['4.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '500' }],
        h1: ['2.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '500' }],
        h2: ['2rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '500' }],
        h3: ['1.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '500' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.5' }],
        legal: ['0.625rem', { lineHeight: '1.5' }],
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '2rem',
        xl: '4rem',
        xxl: '8rem',
      },
      borderRadius: {
        sm: 'var(--ssd-radius-sm)',
        md: 'var(--ssd-radius-md)',
        lg: 'var(--ssd-radius-lg)',
        xl: 'var(--ssd-radius-xl)',
      },
      boxShadow: {
        sm: 'var(--mkt-shadow-sm)',
        md: 'var(--mkt-shadow-md)',
        lg: 'var(--mkt-shadow-lg)',
      },
      maxWidth: {
        content: '68.5rem', // 1096px — Figma 12-col content width
      },
    },
  },
  plugins: [],
};
