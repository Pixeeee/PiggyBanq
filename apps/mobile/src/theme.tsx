import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type MobileThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedMobileTheme = 'light' | 'dark';

export type MobileThemePalette = {
  background: string;
  surface: string;
  surfaceStrong: string;
  card: string;
  cardAlt: string;
  border: string;
  borderSoft: string;
  peach: string;
  salmon: string;
  rose: string;
  plum: string;
  green: string;
  textDark: string;
  textMid: string;
  textSoft: string;
  white: string;
};

export const mobileThemePalettes: Record<ResolvedMobileTheme, MobileThemePalette> = {
  light: {
    background: '#FFF1E9',
    surface: '#FFF0E0',
    surfaceStrong: '#FFE4C8',
    card: '#FFFFFF',
    cardAlt: '#FFF8ED',
    border: '#FDC3A1',
    borderSoft: '#F8D9C1',
    peach: '#FDC3A1',
    salmon: '#FB9B8F',
    rose: '#F57799',
    plum: '#57314B',
    green: '#1D7A59',
    textDark: '#4A2C2A',
    textMid: '#7A4A45',
    textSoft: '#9D706B',
    white: '#FFFFFF'
  },
  dark: {
    background: '#151118',
    surface: '#211922',
    surfaceStrong: '#332638',
    card: '#241E28',
    cardAlt: '#2B2230',
    border: '#493846',
    borderSoft: '#3A2D38',
    peach: '#C7835C',
    salmon: '#E58A7B',
    rose: '#FF8CAC',
    plum: '#F5D8EA',
    green: '#8FD7AE',
    textDark: '#FFF6ED',
    textMid: '#D6BFB8',
    textSoft: '#AA918D',
    white: '#151118'
  }
};

type MobileThemeContextValue = {
  choice: MobileThemeChoice;
  palette: MobileThemePalette;
  resolvedTheme: ResolvedMobileTheme;
  setChoice: (choice: MobileThemeChoice) => void;
};

const MobileThemeContext = createContext<MobileThemeContextValue | null>(null);

export function MobileThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [choice, setChoice] = useState<MobileThemeChoice>('system');
  const resolvedTheme: ResolvedMobileTheme = choice === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : choice;

  const value = useMemo(
    () => ({
      choice,
      palette: mobileThemePalettes[resolvedTheme],
      resolvedTheme,
      setChoice
    }),
    [choice, resolvedTheme]
  );

  return <MobileThemeContext.Provider value={value}>{children}</MobileThemeContext.Provider>;
}

export function useMobileTheme() {
  const context = useContext(MobileThemeContext);

  if (!context) {
    throw new Error('useMobileTheme must be used inside MobileThemeProvider');
  }

  return context;
}
