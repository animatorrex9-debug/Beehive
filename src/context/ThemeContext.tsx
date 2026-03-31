import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') return saved;
      }
    } catch (e) {
      console.warn('[Theme] LocalStorage access denied. Theme will not persist across reloads.', e);
    }
    // Default to 'light' to ensure a consistent starting point regardless of device settings
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove both to be safe before adding the correct one
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Also apply to body for older CSS selectors
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);

    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      // Ignore storage errors in restricted environments
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
