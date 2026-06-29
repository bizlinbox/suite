import type { Metadata, Viewport } from 'next';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import PWARegister from '@/components/PWARegister';
import Toaster from '@/components/Toaster';

export const metadata: Metadata = {
  title: 'BizlInbox - WhatsApp Inbox',
  description: 'Multi-tenant WhatsApp inbox platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BizlInbox',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#002d62',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="/env-config.js" defer />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BizlInbox" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#002d62" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="font-sans bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        <ThemeProvider>
          {children}
          <PWARegister />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
