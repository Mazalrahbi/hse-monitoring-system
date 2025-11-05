'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabaseClient } from '@/lib/supabase/client';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark'; // The actual applied theme (resolves 'system')
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const [theme, setThemeState] = useState<Theme>('light');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  // Load theme from user settings
  useEffect(() => {
    if (!appUser) {
      // If not logged in, use localStorage or default to light
      const savedTheme = localStorage.getItem('theme') as Theme || 'light';
      setThemeState(savedTheme);
      return;
    }

    // Load from database
    const loadTheme = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('user_settings')
          .select('theme')
          .eq('user_id', appUser.user_id)
          .single();

        if (data && data.theme) {
          setThemeState(data.theme as Theme);
        } else if (!error || error.code === 'PGRST116') {
          // No settings found or doesn't exist, use light as default
          setThemeState('light');
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        // Fallback to localStorage or light
        const savedTheme = localStorage.getItem('theme') as Theme || 'light';
        setThemeState(savedTheme);
      }
    };

    loadTheme();
  }, [appUser]);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Determine actual theme
    let appliedTheme: 'light' | 'dark' = 'light';
    
    if (theme === 'system') {
      // Check system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      appliedTheme = systemPrefersDark ? 'dark' : 'light';
    } else {
      appliedTheme = theme;
    }

    // Apply theme
    root.setAttribute('data-theme', appliedTheme);
    setActualTheme(appliedTheme);

    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      const root = window.document.documentElement;
      root.setAttribute('data-theme', newTheme);
      setActualTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);

    // Save to database if logged in
    if (appUser) {
      try {
        await supabaseClient
          .from('user_settings')
          .upsert({
            user_id: appUser.user_id,
            theme: newTheme
          });
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  };

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
