import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-body'
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var storedTheme = window.localStorage.getItem('piggybanq-theme');
                  var theme = storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'system';
                  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var resolvedTheme = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
                  document.documentElement.dataset.theme = theme;
                  document.documentElement.dataset.resolvedTheme = resolvedTheme;
                  document.documentElement.style.colorScheme = resolvedTheme;
                } catch (error) {
                  document.documentElement.dataset.theme = 'system';
                  document.documentElement.dataset.resolvedTheme = 'light';
                  document.documentElement.style.colorScheme = 'light';
                }
              })();
            `
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
