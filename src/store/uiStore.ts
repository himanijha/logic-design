import { create } from 'zustand'

interface UiState {
  netlistOpen: boolean
  toggleNetlist: () => void
  truthTableOpen: boolean
  toggleTruthTable: () => void
}

export const useUiStore = create<UiState>((set) => ({
  netlistOpen: false,
  toggleNetlist: () => set((s) => ({ netlistOpen: !s.netlistOpen, truthTableOpen: false })),
  truthTableOpen: false,
  toggleTruthTable: () => set((s) => ({ truthTableOpen: !s.truthTableOpen, netlistOpen: false })),
}))
