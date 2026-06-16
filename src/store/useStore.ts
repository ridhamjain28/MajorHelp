import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface AppState {
  user: User | null;
  activeTeamId: string | null;
  setUser: (user: User | null) => void;
  setActiveTeamId: (teamId: string | null) => void;
  clearSession: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  activeTeamId: null,
  setUser: (user) => set({ user }),
  setActiveTeamId: (activeTeamId) => set({ activeTeamId }),
  clearSession: () => set({ user: null, activeTeamId: null }),
}));
