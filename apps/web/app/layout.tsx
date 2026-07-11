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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
