'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const router = useRouter(); // ✅ Use router for client-side navigation

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const defaultTheme =
      savedTheme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

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
<button
  onClick={() => router.push('/users')}
  className="px-4 py-2 rounded bg-gray-300 dark:bg-zinc-700"
  title="User Settings"
>
  <SlidersHorizontal className="w-5 h-5" />
</button>


          <button
            onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))}
            className="px-4 py-2 rounded bg-gray-300 dark:bg-zinc-700"
          >
            {theme === 'light' ? '🌙 ' : '☀️ '}
          </button>
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
}
