import { create } from 'zustand';

export type EngineStatus = 'unconfigured' | 'checking' | 'online' | 'offline';

interface EngineStatusState {
  status: EngineStatus;
  versions: Record<string, string> | null;
  checkedAt: number;
  setStatus: (status: EngineStatus, versions?: Record<string, string> | null) => void;
}

export const useEngineStatus = create<EngineStatusState>((set) => ({
  status: 'checking',
  versions: null,
  checkedAt: 0,
  setStatus: (status, versions) =>
    set((s) => ({ status, versions: versions === undefined ? s.versions : versions, checkedAt: Date.now() })),
}));
