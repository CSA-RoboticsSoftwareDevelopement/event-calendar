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
    const [roleValue, setRoleValue] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {

      localStorage.setItem('theme', 'light');
    }, []);

    const handleThemeClick = () => {
      toast('Dark mode will be available soon!', {
        icon: '🚧',
      });
    };



    useEffect(() => {
      const roleStored = sessionStorage.getItem("role");
      if (roleStored) {
        try {
          const decodedRole = atob(roleStored);
          const [, role] = decodedRole.split("|"); // remove salt
          setRoleValue(role); // <-- store in state
          console.log('Role from sessionStorage:', role);
        } catch (err) {
          console.error("Failed to decode role from sessionStorage", err);
        }
      }
    }, []);


    return (
      <ThemeContext.Provider value={{ theme: 'light', setTheme: () => { } }}>
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
            className="w-[97vw] pt-4  mx-auto flex justify-between items-center"
            style={{
              background: 'var(--background)',
              color: 'var(--foreground)',
            }}
          >
            <h1 className="text-xl font-bold">📅 <span className='ml-1'>CSA Events</span></h1>
            <div className="flex items-center gap-2">

              <Tippy content="Home">
                <button
                  onClick={() => (window.location.href = 'https://csaappstore.com/')}
                  className="w-10 h-10 rounded transition-colors duration-200 bg-gray-300 text-black hover:bg-gray-200"
                >
                  🏠
                </button>
              </Tippy>
              <Tippy content={roleValue === '1' ? 'User Settings' : 'Access denied'}>
                <span className="inline-block">
                  <button
                    onClick={() => {
                      if (roleValue === '1') {
                        window.location.href = '/users';
                      }
                    }}
                    disabled={roleValue !== '1'}
                    className={`w-10 h-10 flex justify-center items-center rounded transition-colors duration-200 ${roleValue === '1'
                      ? 'bg-gray-300 text-black hover:bg-gray-200'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                </span>
              </Tippy>



              <Tippy content="Dark mode coming soon!">
                <button
                  onClick={handleThemeClick}
                  className="w-10 h-10 rounded transition-colors duration-200 bg-gray-300 text-black hover:bg-gray-200"
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
