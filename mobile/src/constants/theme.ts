// Design tokens taken from sra.so (colours, radii and shadows from the site's CSS).
export const C = {
  navy: '#1B0E84', // primary brand
  navyDark: '#140A6E',
  blue: '#1B6FD1', // links, tags
  sky: '#62B2F6', // accent
  skySoft: '#9CCBF5',
  tint: '#EEF6FE', // light section background
  tint2: '#D6E6FB',
  border: '#E4E5F0',
  borderSoft: '#F0F1F6',
  text: '#1A1A2E',
  body: '#4F5470',
  muted: '#6B7086',
  bg: '#F7F8FC',
  card: '#FFFFFF',
  white: '#FFFFFF',
  green: '#0F7A3D',
  greenSoft: '#E8F7EE',
  red: '#C62828',
  redSoft: '#FDECEC',
  skeleton: '#E6E9F3',
  skeletonHi: '#F3F5FB',
} as const;

export const F = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const R = { sm: 8, md: 12, lg: 16, xl: 18, pill: 999 } as const;

export const S = { gutter: 16, gap: 12 } as const;

// rgba(27,14,132,.12) navy-tinted shadow used across the site
export const shadow = {
  shadowColor: '#1B0E84',
  shadowOpacity: 0.12,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

export const shadowSm = {
  shadowColor: '#1B0E84',
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;
