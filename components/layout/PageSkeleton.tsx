import { GlassCard } from '@/components/ui/GlassCard';

/** Placeholder shown for the instant before persisted workspace state loads. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading workspace" className="animate-pulse">
      <div className="mb-10 space-y-3">
        <div className="h-4 w-40 rounded-full bg-fill" />
        <div className="h-10 w-72 rounded-xl bg-fill" />
        <div className="h-4 w-full max-w-lg rounded-full bg-fill" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <GlassCard className="h-[480px]" />
        <div className="space-y-5">
          <GlassCard className="h-28" />
          <GlassCard className="h-72" />
        </div>
      </div>
    </div>
  );
}
