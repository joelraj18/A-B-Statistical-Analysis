'use client';

import { motion, MotionConfig } from 'framer-motion';
import { Archive, BookOpen, FlaskConical, LayoutGrid, Target } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Toaster } from '@/components/ui/Toaster';
import { checkEngineHealth } from '@/lib/api/statsService';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';
import { initAuth } from '@/lib/store/auth';
import { migrateLegacyStorage } from '@/lib/store/legacyMigration';
import { useTheme } from '@/lib/store/theme';
import { toast } from '@/lib/store/toast';
import { useWorkspace } from '@/lib/store/workspace';
import { AccountButton } from './AccountButton';
import { EngineStatusBadge } from './EngineStatusBadge';
import { ThemeToggle, useApplyTheme } from './ThemeToggle';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutGrid },
  { href: '/planner/', label: 'Planner', icon: Target, phase: 1 },
  { href: '/analyzer/', label: 'Analyzer', icon: FlaskConical, phase: 3 },
  { href: '/history/', label: 'Archive', icon: Archive, phase: 4 },
  { href: '/guide/', label: 'Guide', icon: BookOpen },
] as const;

function isActive(pathname: string, href: string) {
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return href === '/' ? normalized === '/' : normalized.startsWith(href);
}

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg">
      <span className="grid size-8 place-items-center rounded-[9px] bg-fg text-bg shadow-sm">
        <FlaskConical className="size-[18px]" strokeWidth={2.2} />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">Experiment Lab</span>
        <span className="block text-[11px] font-medium text-faint">A/B Engine 3.0</span>
      </span>
    </Link>
  );
}

function useAppBootstrap() {
  useApplyTheme();
  useEffect(() => {
    void checkEngineHealth();
    void useTheme.persist.rehydrate();
    let unsubscribeAuth = () => {};
    let cancelled = false;
    void Promise.resolve(useWorkspace.persist.rehydrate()).then(() => {
      if (cancelled) return;
      const imported = migrateLegacyStorage();
      if (imported > 0) {
        toast('Archive upgraded', {
          description: `${imported} experiment${imported === 1 ? '' : 's'} re-analysed with the v3 engine.`,
          tone: 'positive',
        });
      }
      unsubscribeAuth = initAuth();
    });
    return () => {
      cancelled = true;
      unsubscribeAuth();
    };
  }, []);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const archiveCount = useWorkspace((s) => s.experiments.length);
  useAppBootstrap();

  return (
    <MotionConfig reducedMotion="user">
      {/* Ambient light — gives the glass something to blur. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-[20%] -top-[30%] h-[70vh] w-[70vw] rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-3xl" />
        <div className="absolute -bottom-[30%] -right-[10%] h-[70vh] w-[60vw] rounded-full bg-[radial-gradient(closest-side,rgb(142_142_147/0.16),transparent)] blur-3xl" />
      </div>

      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-elevated focus:px-4 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-hairline bg-surface backdrop-blur-xl backdrop-saturate-150 lg:flex">
        <div className="px-5 pb-6 pt-6">
          <Wordmark />
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon, ...item }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium tracking-tight transition-colors',
                  active ? 'text-fg' : 'text-muted hover:text-fg',
                )}
              >
                {active && <motion.span layoutId="nav-active" transition={spring} className="absolute inset-0 -z-10 rounded-xl bg-fill" />}
                <Icon className={cn('size-[18px]', active && 'text-accent')} />
                <span className="flex-1">{label}</span>
                {'phase' in item && <span className="text-[11px] font-medium text-faint">Phase {item.phase}</span>}
                {href === '/history/' && archiveCount > 0 && (
                  <span className="tabular rounded-full bg-fill px-1.5 text-[11px] text-muted">{archiveCount}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-4 border-t border-hairline px-5 py-5">
          <EngineStatusBadge />
          <AccountButton />
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hairline bg-surface px-4 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
        <Wordmark />
        <ThemeToggle />
      </header>

      <main id="main" className="min-h-dvh pb-28 lg:ml-[248px] lg:pb-16">
        <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 sm:px-6 lg:px-10 lg:pt-12">{children}</div>
      </main>

      {/* Mobile tab bar */}
      <nav
        aria-label="Primary"
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn('flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium', active ? 'text-accent' : 'text-faint')}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <Toaster />
    </MotionConfig>
  );
}
