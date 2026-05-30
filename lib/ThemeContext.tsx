'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'night';

interface ThemeCtx {
  mode: ThemeMode;
  isDark: boolean;
  isNight: boolean;
  isLight: boolean;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  mode: 'light', isDark: false, isNight: false, isLight: true,
  toggle: () => {}, setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('switch6-theme-mode') as ThemeMode | null;
      if (saved === 'dark' || saved === 'night' || saved === 'light') {
        setModeState(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.body.dataset.theme = mode;
  }, [mode]);

  const setMode = (next: ThemeMode) => {
    try { localStorage.setItem('switch6-theme-mode', next); } catch {}
    setModeState(next);
  };

  const toggle = () => {
    setModeState(prev => {
      const next: ThemeMode = prev === 'light' ? 'dark' : prev === 'dark' ? 'night' : 'light';
      try { localStorage.setItem('switch6-theme-mode', next); } catch {}
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{
      mode,
      isDark: mode !== 'light',
      isNight: mode === 'night',
      isLight: mode === 'light',
      toggle,
      setMode,
    }}>
      {/* No background wrapper here — each page/shell controls its own background.
          The data-theme attribute is set on <html> and <body> above. */}
      <div data-theme={mode} style={{ minHeight: '100vh' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
