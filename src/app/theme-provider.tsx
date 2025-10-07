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
            <h1 className="text-xl font-bold">🗓️<span className='ml-1'>CSA Events</span></h1>
            <div className="flex items-center gap-2">

              <Tippy content="Home">
                <button
                  onClick={() => (window.location.href = 'https://csaappstore.com/')}
                  className="w-10 h-10 rounded flex items-center justify-center transition-colors duration-200 bg-gray-300 hover:bg-gray-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    width="24px"
                    viewBox="0 0 24 24"
                    fill="#2A3439"  // Gunmetal grey
                    className="w-6 h-6"
                  >
                    <path d="M0 0h24v24H0V0z" fill="none" />
                    <path d="M12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81l5-4.5M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
                  </svg>
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      width="24px"
                      viewBox="0 -960 960 960"
                      fill="#2A3439"
                      className="w-6 h-6"
                    >
                      <path d="M400-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm560 40-12-60q-12-5-22.5-10.5T584-204l-58 18-40-68 46-40q-2-14-2-26t2-26l-46-40 40-68 58 18q11-8 21.5-13.5T628-460l12-60h80l12 60q12 5 22.5 11t21.5 15l58-20 40 70-46 40q2 12 2 25t-2 25l46 40-40 68-58-18q-11 8-21.5 13.5T732-180l-12 60h-80Zm40-120q33 0 56.5-23.5T760-320q0-33-23.5-56.5T680-400q-33 0-56.5 23.5T600-320q0 33 23.5 56.5T680-240ZM400-560q33 0 56.5-23.5T480-640q0-33-23.5-56.5T400-720q-33 0-56.5 23.5T320-640q0 33 23.5 56.5T400-560Zm0-80Zm12 400Z" />
                    </svg>
                  </button>
                </span>
              </Tippy>

              <Tippy content="Dark mode coming soon!">
                <button
                  onClick={handleThemeClick}
                  className="w-10 h-10 rounded flex items-center justify-center transition-colors duration-200 bg-gray-300 text-black hover:bg-gray-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    enable-background="new 0 0 24 24"
                    height="24px"
                    viewBox="0 0 24 24"
                    width="24px"
                    fill="#2A3439"
                    className="w-6 h-6"
                  >
                    <rect fill="none" height="24" width="24" />
                    <path d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 
        c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 
        c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z" />
                  </svg>
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
