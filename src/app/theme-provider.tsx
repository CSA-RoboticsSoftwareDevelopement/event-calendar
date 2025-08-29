'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import toast, { Toaster } from 'react-hot-toast';

type Theme = 'light';

interface ThemeContextValue {
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

const ThemeProvider = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    const [theme, setTheme] = useState<Theme>('light');
    const router = useRouter();

    useEffect(() => {
      
      localStorage.setItem('theme', 'light');
    }, []);

    const handleThemeClick = () => {
      toast('Dark mode will be available soon!', {
        icon: '🚧',
      });
    };

    return (
      <ThemeContext.Provider value={{ theme: 'light', setTheme: () => {} }}>
        <div
          ref={ref}
          className="transition-colors duration-300 min-h-screen"
          style={{
            background: 'var(--background)',
            color: 'var(--foreground)',
          }}
        >
          <Toaster />
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
                  className="px-4 py-2 rounded transition-colors duration-200 bg-gray-300 text-black hover:bg-gray-200"
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </button>
              </Tippy>

              <Tippy content="Dark mode coming soon!">
                <button
                  onClick={handleThemeClick}
                  className="px-4 py-2 rounded transition-colors duration-200 bg-gray-300 text-black hover:bg-gray-200"
                >
                  🌙
                </button>
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
      </ThemeContext.Provider>
    );
  }
);

ThemeProvider.displayName = 'ThemeProvider';

export default ThemeProvider;
