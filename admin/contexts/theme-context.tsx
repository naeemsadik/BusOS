'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load theme from localStorage
    const storedTheme = localStorage.getItem('admin-theme') as Theme;
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('admin-theme', theme);

    // Determine actual theme
    let resolvedTheme: 'light' | 'dark';
    
    if (theme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolvedTheme = theme;
    }

    setActualTheme(resolvedTheme);

    // Update document class
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);

    // Update CSS variables
    if (resolvedTheme === 'dark') {
      root.style.setProperty('--background', '#0a0a0a');
      root.style.setProperty('--foreground', '#ededed');
      root.style.setProperty('--card', '#1a1a1a');
      root.style.setProperty('--card-foreground', '#ededed');
      root.style.setProperty('--popover', '#1a1a1a');
      root.style.setProperty('--popover-foreground', '#ededed');
      root.style.setProperty('--primary', '#3b82f6');
      root.style.setProperty('--primary-foreground', '#f8fafc');
      root.style.setProperty('--secondary', '#1e293b');
      root.style.setProperty('--secondary-foreground', '#f1f5f9');
      root.style.setProperty('--muted', '#1e293b');
      root.style.setProperty('--muted-foreground', '#94a3b8');
      root.style.setProperty('--accent', '#1e293b');
      root.style.setProperty('--accent-foreground', '#f1f5f9');
      root.style.setProperty('--destructive', '#dc2626');
      root.style.setProperty('--destructive-foreground', '#f8fafc');
      root.style.setProperty('--border', '#334155');
      root.style.setProperty('--input', '#334155');
      root.style.setProperty('--ring', '#3b82f6');
    } else {
      root.style.setProperty('--background', '#ffffff');
      root.style.setProperty('--foreground', '#171717');
      root.style.setProperty('--card', '#ffffff');
      root.style.setProperty('--card-foreground', '#171717');
      root.style.setProperty('--popover', '#ffffff');
      root.style.setProperty('--popover-foreground', '#171717');
      root.style.setProperty('--primary', '#3b82f6');
      root.style.setProperty('--primary-foreground', '#f8fafc');
      root.style.setProperty('--secondary', '#f1f5f9');
      root.style.setProperty('--secondary-foreground', '#0f172a');
      root.style.setProperty('--muted', '#f1f5f9');
      root.style.setProperty('--muted-foreground', '#64748b');
      root.style.setProperty('--accent', '#f1f5f9');
      root.style.setProperty('--accent-foreground', '#0f172a');
      root.style.setProperty('--destructive', '#dc2626');
      root.style.setProperty('--destructive-foreground', '#f8fafc');
      root.style.setProperty('--border', '#e2e8f0');
      root.style.setProperty('--input', '#e2e8f0');
      root.style.setProperty('--ring', '#3b82f6');
    }

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setActualTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
