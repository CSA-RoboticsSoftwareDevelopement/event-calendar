'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css'; // optional CSS

const ThemeProvider = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const router = useRouter(); // ✅ Use router for client-side navigation

    useEffect(() => {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      let defaultTheme: 'light' | 'dark' = 'light'; // default for SSR

      if (typeof window !== 'undefined') {
        defaultTheme =
          savedTheme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      }

      setTheme(defaultTheme);

      if (defaultTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      console.log('[Init Theme]:', defaultTheme);
    }, []);

    useEffect(() => {
      localStorage.setItem('theme', theme);

      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      console.log('[Changed Theme]:', theme);
    }, [theme]);

    return (
      <div
        ref={ref}   // <-- add this line
        className="transition-colors duration-300 min-h-screen"
        style={{
          background: 'var(--background)',
          color: 'var(--foreground)',
        }}
      >

        <header
          className="p-4 flex justify-between items-center"
          style={{
            background: 'var(--background)',
            color: 'var(--foreground)',
          }}
        >
          <h1 className="text-xl font-bold">📅 CSA Events</h1>
          <div className="flex items-center gap-2">
            <Tippy content="User Settings">
              <button
                onClick={() => (window.location.href = '/users')}
                className="px-4 py-2 rounded bg-gray-300 dark:bg-zinc-700"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </Tippy>


          <Tippy content="Dark mode will be available soon">
              <span className="inline-block">
                <button
                  onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))}
                className="px-4 py-2 rounded bg-gray-300 dark:bg-zinc-700 cursor-not-allowed opacity-50"
                disabled
                >
                  {theme === 'light' ? '🌙 ' : '☀️ '}
                </button>
              </span>
            </Tippy>

          </div>
        </header>
        <main
          className="p-4"
          style={{
            background: 'var(--background)',
            color: 'var(--foreground)',
          }}
        >
          {children}
        </main>
      </div>
    );
  });
ThemeProvider.displayName = 'ThemeProvider';

export default ThemeProvider;

