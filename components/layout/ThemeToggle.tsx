'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme, useThemeHydrated, type ThemePreference } from '@/lib/store/theme';

const OPTIONS = [
  { value: 'light', label: null, icon: <Sun />, ariaLabel: 'Light appearance' },
  { value: 'system', label: null, icon: <Monitor />, ariaLabel: 'Match system appearance' },
  { value: 'dark', label: null, icon: <Moon />, ariaLabel: 'Dark appearance' },
] as const;

/** Applies the theme preference to <html> and follows OS changes in "system" mode. */
export function useApplyTheme() {
  const theme = useTheme((s) => s.theme);
  const hydrated = useThemeHydrated();
  useEffect(() => {
    // Until the preference is loaded, the inline boot script's class is authoritative.
    if (!hydrated) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches));
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme, hydrated]);
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);
  return (
    <SegmentedControl<ThemePreference>
      ariaLabel="Appearance"
      size="sm"
      options={OPTIONS}
      value={theme}
      onChange={setTheme}
      className={className}
    />
  );
}
