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
    background: '#FAF6F3',
    surface: '#FFFFFF',
    surfaceStrong: '#FCE7E2',
    card: '#FFFFFF',
    cardAlt: '#F5EFEC',
    border: '#EADDD8',
    borderSoft: '#F0E7E3',
    peach: '#FDC3A1',
    salmon: '#FB9B8F',
    rose: '#C74461',
    plum: '#542A3C',
    green: '#147D65',
    textDark: '#38252C',
    textMid: '#806B73',
    textSoft: '#927C85',
    white: '#FFFFFF'
  },
  dark: {
    background: '#211A20',
    surface: '#2D242C',
    surfaceStrong: '#3C2B33',
    card: '#2D242C',
    cardAlt: '#382C35',
    border: '#493943',
    borderSoft: '#40313B',
    peach: '#C7835C',
    salmon: '#E58A7B',
    rose: '#FF8CAC',
    plum: '#F5D8EA',
    green: '#8FD7AE',
    textDark: '#F4F7F9',
    textMid: '#C0CDD5',
    textSoft: '#9AADB9',
    white: '#211A20'
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
