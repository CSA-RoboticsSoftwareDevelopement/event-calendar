'use client';

import { useEffect, useState } from 'react';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize theme on first render
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

  // Watch for theme changes
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
    <div className="transition-colors duration-300 bg-white text-black dark:bg-zinc-900 dark:text-white min-h-screen">
      <header className="p-4 bg-gray-200 dark:bg-zinc-800 flex justify-between items-center">
        <h1 className="text-xl font-bold">📅 CSA Events</h1>
        <button
          onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))}
          className="px-4 py-2 rounded bg-gray-300 dark:bg-zinc-700"
        >
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
