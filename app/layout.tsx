import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { themeBootScript } from '@/lib/store/themeBoot';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Experiment Lab — A/B Engine',
    template: '%s · Experiment Lab',
  },
  description:
    'Plan, analyse and archive controlled experiments with exact p-values, sample-size planning, SRM checks and CUPED variance reduction.',
  applicationName: 'Experiment Lab',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
