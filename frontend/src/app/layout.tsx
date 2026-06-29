import type { Metadata, Viewport } from 'next';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import Toaster from '@/components/Toaster';

export const metadata: Metadata = {
  title: 'BizlInbox - WhatsApp Inbox',
  description: 'Multi-tenant WhatsApp inbox platform',
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
      </head>
      <body className="font-sans bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
