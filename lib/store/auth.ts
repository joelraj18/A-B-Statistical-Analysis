'use client';

import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { ExperimentRepository } from '@/lib/db/experiments';
import { getSupabase, isCloudEnabled } from '@/lib/db/supabase';
import { toast } from './toast';
import { useWorkspace } from './workspace';

interface AuthState {
  user: User | null;
  syncing: boolean;
  setUser: (user: User | null) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  syncing: false,
  setUser: (user) => set({ user }),
  setSyncing: (syncing) => set({ syncing }),
}));

/** Pulls the cloud archive and pushes local-only experiments. */
export async function syncArchive(): Promise<void> {
  if (!isCloudEnabled || !useAuth.getState().user) return;
  const { setSyncing } = useAuth.getState();
  setSyncing(true);
  try {
    const remote = await ExperimentRepository.list();
    const remoteIds = new Set(remote.map((r) => r.id));
    const localOnly = useWorkspace.getState().experiments.filter((e) => !remoteIds.has(e.id));
    await Promise.all(localOnly.map((e) => ExperimentRepository.upsert(e)));
    useWorkspace.getState().mergeExperiments(remote);
  } catch (err) {
    toast('Sync failed', { description: err instanceof Error ? err.message : undefined, tone: 'negative' });
  } finally {
    setSyncing(false);
  }
}

/** Subscribes to Supabase auth state. Returns an unsubscribe function. */
export function initAuth(): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  supabase.auth.getSession().then(({ data }) => {
    useAuth.getState().setUser(data.session?.user ?? null);
    if (data.session) void syncArchive();
  });
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    useAuth.getState().setUser(session?.user ?? null);
    if (event === 'SIGNED_IN') void syncArchive();
  });
  return () => data.subscription.unsubscribe();
}

export async function sendMagicLink(email: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Cloud sync is not configured.');
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}${basePath}/history/` },
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}
