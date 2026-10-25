/**
 * Design tokens from the Figma "Nuvora Tokens" variable collection
 * (file ziahdesign → page "App Nuvora" → 2. Design System).
 */
export const colors = {
  primary: '#4338ca',
  primaryDark: '#312e81',
  accent: '#818cf8',
  primary50: '#eeedfd',
  primary100: '#dfddfb',
  bg: '#f4f2ee',
  surface: '#ffffff',
  text: '#17161c',
  textSecondary: '#6b6872',
  textTertiary: '#a19ea8',
  border: '#ece9e4',
  muted: '#f0eeea',
  success: '#16a34a',
  success50: '#f0fdf4',
  successText: '#15803d',
  warning: '#d97706',
  warning50: '#fffbeb',
  warningText: '#b45309',
  error: '#dc2626',
  error50: '#fef2f2',
  errorText: '#b91c1c',
  onPrimary: '#ffffff',
  ink: '#17161c',
  warm: '#f2a65a',
  warm50: '#fdf1e4',
  violet: '#9b7bea',
  violet50: '#f1ecfc',
  hatch: '#e9e6f7',
  scrim: 'rgba(15, 23, 42, 0.40)',
} as const;

export type ColorToken = keyof typeof colors;

export const space = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, card: 24, sheet: 24, hero: 28, full: 999 } as const;

/** Screen side margin from the layout spec ("Frame 390 × 844 · 24 px side margins"). */
export const SIDE = 24;

/** Ambient gradient painted behind the top 460 px of every app screen. */
export const ambientGradient = {
  colors: ['#fce7d6', 'rgba(236, 229, 250, 0.85)', 'rgba(244, 242, 238, 0)'] as const,
  locations: [0, 0.45, 1] as const,
  height: 460,
};

/** Welcome screen uses a full-bleed version of the same palette. */
export const welcomeGradient = {
  colors: ['#fce4d1', '#eae4fa', '#f4f2ee'] as const,
  locations: [0, 0.55, 1] as const,
};

/** Footer actions / bottom navigation shadow: 0 −6 24 rgba(23,22,28,0.06). */
export const shadows = {
  footer: {
    shadowColor: '#17161c',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
  toast: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  raised: {
    shadowColor: '#17161c',
    shadowOpacity: 0.25,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;
