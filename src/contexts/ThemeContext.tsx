import React, { createContext, useEffect, useState, useContext } from 'react';
import { useAuth } from './AuthContext';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check for userTheme first (from Settings), then theme
    const userTheme = localStorage.getItem('userTheme');
    if (userTheme === 'dark' || userTheme === 'light') return userTheme;

    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;

    // Default to light theme
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save to both keys for compatibility
    localStorage.setItem('theme', theme);
    localStorage.setItem('userTheme', theme);
  }, [theme]);

  const toggleTheme = () => setThemeState(prev => prev === 'dark' ? 'light' : 'dark');

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
