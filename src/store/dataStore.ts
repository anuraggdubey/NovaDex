'use client';
import { create } from 'zustand';

/** Bumped after swaps are recorded or when revisiting data-heavy pages — views refetch on change. */
export const useDataStore = create<{ tick: number; bump: () => void }>((set) => ({
  tick: 0,
  bump: () => set((s) => ({ tick: s.tick + 1 })),
}));
