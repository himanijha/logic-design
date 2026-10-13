import { beforeEach, describe, expect, it } from 'vitest'
import { useCircuitStore } from './circuitStore'
import { useSimulationStore } from './simulationStore'

beforeEach(() => {
  useCircuitStore.setState({ nodes: [], edges: [] })
  useSimulationStore.setState({ active: false, history: [], index: 0 })
})

describe('simulationStore', () => {
  it('toggling an input advances history and can be stepped back and forward', () => {
    const { addGate, onConnect } = useCircuitStore.getState()
    addGate('INPUT', { x: 0, y: 0 })
    addGate('NOT', { x: 100, y: 0 })
    const [input, not] = useCircuitStore.getState().nodes
    onConnect({ source: input.id, sourceHandle: 'out', target: not.id, targetHandle: 'a' })

    useSimulationStore.getState().enter()
    expect(useSimulationStore.getState().history).toHaveLength(1)
    expect(useSimulationStore.getState().history[0].outputs[not.id]).toEqual([true])

    useSimulationStore.getState().toggleInput(input.id)
    expect(useSimulationStore.getState().index).toBe(1)
    expect(useSimulationStore.getState().history[1].outputs[not.id]).toEqual([false])
    expect(useSimulationStore.getState().history[1].changedGateIds).toContain(not.id)

    useSimulationStore.getState().stepBack()
    expect(useSimulationStore.getState().index).toBe(0)

    useSimulationStore.getState().stepForward()
    expect(useSimulationStore.getState().index).toBe(1)
    expect(useSimulationStore.getState().history[useSimulationStore.getState().index].outputs[not.id]).toEqual([false])
  })

  it('toggling after stepping back truncates the redone future', () => {
    const { addGate } = useCircuitStore.getState()
    addGate('INPUT', { x: 0, y: 0 })
    const [input] = useCircuitStore.getState().nodes

    useSimulationStore.getState().enter()
    useSimulationStore.getState().toggleInput(input.id)
    useSimulationStore.getState().toggleInput(input.id)
    expect(useSimulationStore.getState().history).toHaveLength(3)

    useSimulationStore.getState().stepBack()
    useSimulationStore.getState().toggleInput(input.id)
    expect(useSimulationStore.getState().history).toHaveLength(3)
    expect(useSimulationStore.getState().index).toBe(2)
  })
})
