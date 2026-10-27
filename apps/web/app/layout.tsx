import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './dashboard-banking.css';
import './site-experience.css';
import { SiteNavigation } from './components/SiteNavigation';

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
        <script src="/theme-init.js" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}><SiteNavigation /><div id="site-content" tabIndex={-1}>{children}</div></body>
    </html>
  );
}
