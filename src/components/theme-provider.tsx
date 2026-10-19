'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

import { initializeFirebase } from '@/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export type Theme = 'aces' | 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('aces');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check saved theme in localStorage, fallback to aces
    const saved = localStorage.getItem('aces-theme') as Theme | null;
    const initialTheme: Theme = saved === 'light' ? 'light' : saved === 'dark' ? 'dark' : 'aces';
    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);

    // Sync from Firestore user profile if logged in
    try {
      const { auth, firestore } = initializeFirebase();
      const unsub = auth.onAuthStateChanged(async (currentUser) => {
        if (currentUser) {
          try {
            const snap = await getDoc(doc(firestore, 'users', currentUser.uid));
            if (snap.exists()) {
              const data = snap.data();
              if (data?.preferredTheme === 'light' || data?.preferredTheme === 'dark' || data?.preferredTheme === 'aces') {
                const cloudTheme = data.preferredTheme as Theme;
                const local = localStorage.getItem('aces-theme') as Theme | null;
                if (!local || local !== cloudTheme) {
                  setThemeState(cloudTheme);
                  localStorage.setItem('aces-theme', cloudTheme);
                  applyTheme(cloudTheme);
                }
              }
            }
          } catch (e) {}
        }
      });
      return () => unsub();
    } catch (e) {}
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light', 'theme-aces');
    if (t === 'aces') {
      root.classList.add('dark', 'theme-aces');
    } else if (t === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('aces-theme', newTheme);
    applyTheme(newTheme);

    try {
      const { auth, firestore } = initializeFirebase();
      if (auth.currentUser) {
        updateDoc(doc(firestore, 'users', auth.currentUser.uid), {
          preferredTheme: newTheme,
        }).catch(() => {});
      }
    } catch (e) {}
  };

  const toggleTheme = () => {
    // Cycle: Původní Aces -> Noční grafit -> Světlý -> Původní Aces
    const nextTheme: Theme = theme === 'aces' ? 'dark' : theme === 'dark' ? 'light' : 'aces';
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  const getThemeTitle = () => {
    if (theme === 'aces') return 'Aktivní motiv: Původní HC Aces (kliknutím přepnete na Noční grafit)';
    if (theme === 'dark') return 'Aktivní motiv: Noční grafit (kliknutím přepnete na Světlý režim)';
    return 'Aktivní motiv: Světlý režim (kliknutím přepnete na Původní HC Aces)';
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        toggleTheme();
        e.currentTarget.blur();
      }}
      className={cn(
        'relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-transform hover:scale-105 active:scale-95 focus:outline-none',
        className
      )}
      title={getThemeTitle()}
      aria-label="Přepnout motiv vzhledu"
    >
      {theme === 'aces' && (
        <Flame className="h-4 w-4 text-amber-500 fill-amber-500/20" />
      )}
      {theme === 'dark' && (
        <Moon className="h-4 w-4 text-sky-400" />
      )}
      {theme === 'light' && (
        <Sun className="h-4 w-4 text-amber-500" />
      )}
      <span className="sr-only">Přepnout motiv vzhledu</span>
    </Button>
  );
}
