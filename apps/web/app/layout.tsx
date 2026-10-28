import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { Geist, Geist_Mono, Grandstander } from 'next/font/google';
import './globals.css';
import './dashboard-banking.css';
import './site-experience.css';
import './dashboard-mossforge.css';
import { SiteNavigation } from './components/SiteNavigation';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-body'
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

const playful = Grandstander({subsets:['latin'],variable:'--font-playful',display:'swap'});

export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover'};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="/theme-init.js" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${playful.variable}`}><SiteNavigation /><div id="site-content" tabIndex={-1}>{children}</div></body>
    </html>
  );
}
