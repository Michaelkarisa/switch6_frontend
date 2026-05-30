import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/ThemeContext';

export const metadata: Metadata = {
  title: 'Switch6 — Sports Broadcast Studio',
  description: 'Professional match management, live streaming, and advertisement platform for football clubs.',
  keywords: ['sports broadcasting', 'match management', 'live streaming', 'football', 'advertisement'],
  authors: [{ name: 'Switch6' }],
  robots: 'noindex, nofollow', // internal platform — not for public indexing
  openGraph: {
    title: 'Switch6 — Sports Broadcast Studio',
    description: 'Professional match management and live streaming platform',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,   // prevent auto-zoom on input focus on iOS
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#0f1117' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        body: NO overflow-hidden here — auth pages (login/register) need to scroll.
        Each page/shell that needs overflow-hidden (dashboard etc) applies it to its
        own container, not to body.
      */}
      <body className="antialiased" style={{ margin: 0, padding: 0 }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
