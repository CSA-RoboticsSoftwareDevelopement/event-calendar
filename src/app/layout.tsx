import './globals.css';
import type { Metadata } from 'next';
import ThemeProvider from './theme-provider';

export const metadata: Metadata = {
  title: 'CSA Events',
  description: 'Create and manage events like Google Calendar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen"
        style={{
          background: 'var(--background)',
          color: 'var(--foreground)',
        }}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
