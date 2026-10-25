import type { TextStyle } from 'react-native';

/** Font family names registered in the root layout via expo-font. */
export const fonts = {
  serif: 'InstrumentSerif_400Regular',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  wordmark: 'Manrope_800ExtraBold',
} as const;

/**
 * Text styles from the Figma "Nuvora/*" text styles.
 * Letter spacing is converted from % of font size to points.
 */
export const type = {
  display: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 42, letterSpacing: -0.38 },
  kpiLarge: { fontFamily: fonts.semibold, fontSize: 40, lineHeight: 44, letterSpacing: -1.6 },
  kpi: { fontFamily: fonts.semibold, fontSize: 26, lineHeight: 30, letterSpacing: -0.78 },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 32, letterSpacing: -0.14 },
  heading: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 28, letterSpacing: -0.12 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.66,
    textTransform: 'uppercase',
  },
  figure: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.15,
    fontVariant: ['tabular-nums'],
  },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  nav: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
