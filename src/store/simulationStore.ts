import { create } from 'zustand'
import { advance, EMPTY_SIM_STATE, settle, type OutputMap, type SimState } from '../sim/engine'
import { flattenCanvas } from '../sim/netlist'
import { useCircuitStore } from './circuitStore'

export interface SimSnapshot {
  state: SimState
  outputs: OutputMap
  changedGateIds: string[]
  cyclicGateIds: string[]
  label: string
}

interface SimulationStoreState {
  active: boolean
  history: SimSnapshot[]
  index: number
  enter: () => void
  exit: () => void
  toggleInput: (gateId: string) => void
  tickClock: (gateId: string) => void
  stepBack: () => void
  stepForward: () => void
  reset: () => void
}

function initialSnapshot(): SimSnapshot {
  const { nodes, edges } = flattenCanvas(useCircuitStore.getState().nodes, useCircuitStore.getState().edges)
  const result = settle(nodes, edges, EMPTY_SIM_STATE)
  return {
    state: EMPTY_SIM_STATE,
    outputs: result.outputs,
    changedGateIds: [],
    cyclicGateIds: result.cyclicGateIds,
    label: 'Start',
  }
}

function applyAdvance(prev: SimSnapshot, nextState: SimState, label: string): SimSnapshot {
  const { nodes, edges } = flattenCanvas(useCircuitStore.getState().nodes, useCircuitStore.getState().edges)
  const result = advance(nodes, edges, nextState, prev.outputs)
  return {
    state: result.state,
    outputs: result.outputs,
    changedGateIds: result.changedGateIds,
    cyclicGateIds: result.cyclicGateIds,
    label,
  }
}

export const useSimulationStore = create<SimulationStoreState>((set, get) => ({
  active: false,
  history: [],
  index: 0,

  enter: () => {
    set({ active: true, history: [initialSnapshot()], index: 0 })
  },

  exit: () => {
    set({ active: false, history: [], index: 0 })
  },

  reset: () => {
    set({ history: [initialSnapshot()], index: 0 })
  },

  toggleInput: (gateId) => {
    const { history, index } = get()
    const prev = history[index]
    const nextState: SimState = {
      ...prev.state,
      inputs: { ...prev.state.inputs, [gateId]: !(prev.state.inputs[gateId] ?? false) },
    }
    const snapshot = applyAdvance(prev, nextState, `Toggle input`)
    set({ history: [...history.slice(0, index + 1), snapshot], index: index + 1 })
  },

  tickClock: (gateId) => {
    const { history, index } = get()
    const prev = history[index]
    const nextState: SimState = {
      ...prev.state,
      registers: { ...prev.state.registers, [gateId]: !(prev.state.registers[gateId] ?? false) },
    }
    const snapshot = applyAdvance(prev, nextState, `Tick clock`)
    set({ history: [...history.slice(0, index + 1), snapshot], index: index + 1 })
  },

  stepBack: () => {
    set((s) => ({ index: Math.max(0, s.index - 1) }))
  },

  stepForward: () => {
    set((s) => ({ index: Math.min(s.history.length - 1, s.index + 1) }))
  },
}))

export function useCurrentSnapshot(): SimSnapshot | undefined {
  return useSimulationStore((s) => s.history[s.index])
}
