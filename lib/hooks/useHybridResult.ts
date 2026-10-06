'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EngineSource } from '@/types/stats';
import { StatsInputError } from '@/lib/stats/abEngine';

export interface HybridResult<T> {
  data: T | null;
  error: string | null;
  source: EngineSource | null;
}

/**
 * Computes `local(input)` synchronously on every change, then — debounced —
 * asks `remote(input)` (SciPy) for the authoritative result. The remote value
 * is only shown while it still corresponds to the current input.
 */
export function useHybridResult<I, T>(
  input: I | null,
  local: (input: I) => T,
  remote: (input: I, signal: AbortSignal) => Promise<T | null>,
  delayMs = 300,
): HybridResult<T> {
  const key = input === null ? null : JSON.stringify(input);
  const parsed = useMemo(() => (key === null ? null : (JSON.parse(key) as I)), [key]);

  const localResult = useMemo((): { data: T | null; error: string | null } => {
    if (parsed === null) return { data: null, error: null };
    try {
      return { data: local(parsed), error: null };
    } catch (err) {
      return { data: null, error: err instanceof StatsInputError ? err.message : 'Unable to compute this analysis.' };
    }
  }, [parsed, local]);

  const [remoteResult, setRemoteResult] = useState<{ key: string; data: T } | null>(null);

  useEffect(() => {
    if (parsed === null || key === null || localResult.data === null) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      remote(parsed, controller.signal).then((data) => {
        if (data !== null && !controller.signal.aborted) setRemoteResult({ key, data });
      });
    }, delayMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [parsed, key, localResult.data, remote, delayMs]);

  if (localResult.error) return { data: null, error: localResult.error, source: null };
  if (remoteResult && remoteResult.key === key) return { data: remoteResult.data, error: null, source: 'scipy' };
  return { data: localResult.data, error: null, source: localResult.data ? 'local' : null };
}
