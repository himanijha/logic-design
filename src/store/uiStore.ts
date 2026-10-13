import { create } from 'zustand'

interface UiState {
  netlistOpen: boolean
  toggleNetlist: () => void
}

export const useUiStore = create<UiState>((set) => ({
  netlistOpen: false,
  toggleNetlist: () => set((s) => ({ netlistOpen: !s.netlistOpen })),
}))
