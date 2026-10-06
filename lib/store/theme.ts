'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

import { THEME_STORAGE_KEY } from './themeBoot';

interface ThemeState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const useTheme = create<ThemeState>()(
  persist((set) => ({ theme: 'system', setTheme: (theme) => set({ theme }) }), {
    name: THEME_STORAGE_KEY,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  }),
);

export function useThemeHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useTheme.persist.onFinishHydration(onChange),
    () => useTheme.persist.hasHydrated(),
    () => false,
  );
}
