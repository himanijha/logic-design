import { create } from 'zustand'

interface UiState {
  netlistOpen: boolean
  toggleNetlist: () => void
  truthTableOpen: boolean
  toggleTruthTable: () => void
  showExpressions: boolean
  toggleShowExpressions: () => void
  helpOpen: boolean
  toggleHelp: () => void
}

export const useUiStore = create<UiState>((set) => ({
  netlistOpen: false,
  toggleNetlist: () => set((s) => ({ netlistOpen: !s.netlistOpen, truthTableOpen: false })),
  truthTableOpen: false,
  toggleTruthTable: () => set((s) => ({ truthTableOpen: !s.truthTableOpen, netlistOpen: false })),
  showExpressions: true,
  toggleShowExpressions: () => set((s) => ({ showExpressions: !s.showExpressions })),
  helpOpen: false,
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
}))
