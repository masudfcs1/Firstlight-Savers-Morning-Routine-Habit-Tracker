import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const palette = {
  ivory: '#FAF7F0',
  ivoryDeep: '#F3EEE4',
  forest: '#173F35',
  forestLight: '#285D50',
  forestDark: '#0D2923',
  sage: '#B8C9AF',
  sageLight: '#DDE6D8',
  sageDark: '#779078',
  amber: '#E8AD63',
  amberLight: '#F7DFC0',
  amberDark: '#B9742F',
  charcoal: '#292D2B',
  warmGray: '#E8E3D9',
  warmGrayDark: '#8C8A82',
  white: '#FFFFFF',
  black: '#101311',
  moss: '#4E7468',
  rose: '#C98E7B',
  plum: '#8E7899',
  sky: '#7F9FA6',
  danger: '#B95F54',
} as const;

export const activityPalette = {
  SILENCE: '#6F958A',
  AFFIRMATIONS: '#D59463',
  VISUALIZATION: '#8E7899',
  EXERCISE: '#C9795D',
  READING: '#557F70',
  SCRIBING: '#A9776E',
} as const;

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryPressed: string;
  action: string;
  accent: string;
  accentSoft: string;
  sage: string;
  border: string;
  borderStrong: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
  tabBar: string;
  white: string;
  black: string;
};

export const lightColors: ThemeColors = {
  background: palette.ivory,
  surface: palette.white,
  surfaceElevated: '#FFFEFB',
  surfaceMuted: palette.ivoryDeep,
  text: palette.charcoal,
  textMuted: '#626761',
  textSubtle: '#898B85',
  primary: palette.forest,
  primaryPressed: palette.forestLight,
  action: palette.forest,
  accent: palette.amber,
  accentSoft: palette.amberLight,
  sage: palette.sage,
  border: palette.warmGray,
  borderStrong: '#D5CEC0',
  success: '#3E7565',
  warning: palette.amberDark,
  danger: palette.danger,
  overlay: 'rgba(20, 29, 25, 0.46)',
  tabBar: 'rgba(255, 254, 251, 0.97)',
  white: palette.white,
  black: palette.black,
};

export const darkColors: ThemeColors = {
  background: '#10241F',
  surface: '#18312B',
  surfaceElevated: '#1D3932',
  surfaceMuted: '#142C26',
  text: '#F4F1E9',
  textMuted: '#C3CAC3',
  textSubtle: '#929D95',
  primary: '#AFCABF',
  primaryPressed: '#C6D9D0',
  action: '#356B5C',
  accent: '#E9B36E',
  accentSoft: '#523E29',
  sage: '#789486',
  border: '#2B4941',
  borderStrong: '#3C5A51',
  success: '#86B8A6',
  warning: '#E9B36E',
  danger: '#E3988F',
  overlay: 'rgba(2, 10, 8, 0.68)',
  tabBar: 'rgba(20, 44, 38, 0.98)',
  white: palette.white,
  black: palette.black,
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '700',
    letterSpacing: -1.4,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  subheading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  overline: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  number: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  },
} satisfies Record<string, TextStyle>;

export const lightShadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#173F35',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.07,
      shadowRadius: 18,
    },
    android: { elevation: 2 },
    default: { boxShadow: '0 8px 24px rgba(23,63,53,0.08)' },
  }) ?? {},
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#173F35',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 22,
    },
    android: { elevation: 8 },
    default: { boxShadow: '0 12px 30px rgba(23,63,53,0.16)' },
  }) ?? {},
};

export const darkShadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
    },
    android: { elevation: 2 },
    default: { boxShadow: '0 8px 24px rgba(0,0,0,0.18)' },
  }) ?? {},
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 22,
    },
    android: { elevation: 9 },
    default: { boxShadow: '0 12px 30px rgba(0,0,0,0.3)' },
  }) ?? {},
};

export const shadows = lightShadows;

export const motion = {
  quick: 140,
  standard: 260,
  gentle: 420,
  spring: { damping: 16, stiffness: 180, mass: 0.7 },
} as const;

export const layout = {
  screenPadding: spacing.lg,
  maxContentWidth: 680,
  minTouchTarget: 44,
} as const;
