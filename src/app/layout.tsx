import './globals.css';
import type { Metadata } from 'next';
import ThemeProvider from './theme-provider';
import { ToasterProvider } from 'src/components/ToasterProvider';
import {Inter} from "next/font/google"

const inter = Inter({subsets: ["latin"], variable: "--font-sans"})

export const metadata: Metadata = {
  title: 'CSA Events',
  description: 'Create and manage events like Google Calendar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body
        className="min-h-screen"
        style={{
          background: 'var(--background)',
          color: 'var(--foreground)',
        }}
      >
        <ThemeProvider>
          <ToasterProvider />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}