import { create } from 'zustand';

export type ToastTone = 'neutral' | 'positive' | 'negative';

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id' | 'tone'> & { tone?: ToastTone }) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: ({ tone = 'neutral', ...toast }) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, tone, ...toast }] }));
    setTimeout(() => get().dismiss(id), 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (title: string, options: { description?: string; tone?: ToastTone } = {}) =>
  useToasts.getState().push({ title, ...options });
