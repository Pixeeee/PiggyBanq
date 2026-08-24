import type { SocialIdentityProvider } from './types';

export const palette = {
  background: '#FFF1E9',
  surface: '#FFF0E0',
  surfaceStrong: '#FFE4C8',
  peach: '#FDC3A1',
  salmon: '#FB9B8F',
  rose: '#F57799',
  plum: '#57314B',
  green: '#1D7A59',
  textDark: '#4A2C2A',
  textMid: '#7A4A45',
  white: '#FFFFFF'
};

export const socialIdentityProviders: SocialIdentityProvider[] = [
  { id: 'privy', label: 'Privy identity login', methods: 'Google, X, email, or phone' },
  { id: 'web3auth', label: 'Web3Auth identity login', methods: 'Google, X, email, or phone' }
];

export type LoginFitLayoutInput = {
  height: number;
  insets: { bottom: number; top: number };
  width: number;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function createLoginFitLayout({ height, insets, width }: LoginFitLayoutInput) {
  const safeTop = Math.max(insets.top, 22);
  const safeBottom = Math.max(insets.bottom, 18);
  const compact = height < 720 ? 'short' : height < 820 ? 'medium' : 'regular';
  const horizontal = width < 360 ? 14 : 16;
  const contentWidth = clamp(width - horizontal * 2, 1, 430);

  return {
    screen: {
      paddingBottom: safeBottom + (compact === 'short' ? 6 : 10),
      paddingHorizontal: horizontal,
      paddingTop: safeTop + (compact === 'short' ? 4 : 10)
    },
    heroMarginTop: compact === 'short' ? 22 : compact === 'medium' ? 34 : 46,
    heroFontSize: compact === 'short' ? 28 : compact === 'medium' ? 31 : 34,
    heroLineHeight: compact === 'short' ? 31 : compact === 'medium' ? 34 : 37,
    walletCardMarginTop: compact === 'short' ? 24 : compact === 'medium' ? 32 : 40,
    walletCardMinHeight: compact === 'short' ? 142 : compact === 'medium' ? 154 : 167,
    walletPigSize: compact === 'short' ? { height: 58, width: 70 } : compact === 'medium' ? { height: 66, width: 78 } : { height: 74, width: 84 },
    buttonMarginTop: compact === 'short' ? 22 : compact === 'medium' ? 32 : 42,
    buttonMinHeight: compact === 'short' ? 44 : 48,
    dividerMarginTop: compact === 'short' ? 24 : compact === 'medium' ? 34 : 43,
    identityMarginTop: compact === 'short' ? 10 : 14,
    identityMinHeight: compact === 'short' ? 44 : 50,
    footerMarginTop: compact === 'short' ? 22 : compact === 'medium' ? 32 : 42,
    maxWidth: contentWidth
  };
}
