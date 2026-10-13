import { beforeEach, describe, expect, it } from 'vitest'
import { useCircuitStore } from './circuitStore'

beforeEach(() => {
  useCircuitStore.setState({ nodes: [], edges: [] })
})

describe('circuitStore grouping', () => {
  it('groups two connected gates into a collapsed block and ungroups back', () => {
    const { addGate, onConnect } = useCircuitStore.getState()

    addGate('INPUT', { x: 0, y: 0 })
    addGate('INPUT', { x: 0, y: 100 })
    addGate('AND', { x: 200, y: 50 })
    addGate('OUTPUT', { x: 400, y: 50 })

    const [in1, in2, and, out] = useCircuitStore.getState().nodes

    onConnect({ source: in1.id, sourceHandle: 'out', target: and.id, targetHandle: 'a' })
    onConnect({ source: in2.id, sourceHandle: 'out', target: and.id, targetHandle: 'b' })
    onConnect({ source: and.id, sourceHandle: 'out', target: out.id, targetHandle: 'a' })

    expect(useCircuitStore.getState().edges).toHaveLength(3)

    // A single-node selection is a no-op — grouping requires at least two gates.
    useCircuitStore.setState({
      nodes: useCircuitStore.getState().nodes.map((n) => ({ ...n, selected: n.id === and.id })),
    })
    useCircuitStore.getState().groupSelected()
    expect(useCircuitStore.getState().nodes.some((n) => n.type === 'group')).toBe(false)

    // Select AND + OUTPUT and group them.
    useCircuitStore.setState({
      nodes: useCircuitStore.getState().nodes.map((n) => ({
        ...n,
        selected: n.id === and.id || n.id === out.id,
      })),
    })
    useCircuitStore.getState().groupSelected()

    const afterGroup = useCircuitStore.getState()
    const group = afterGroup.nodes.find((n) => n.type === 'group')
    expect(group).toBeDefined()
    expect(afterGroup.nodes).toHaveLength(3) // in1, in2, group
    if (group?.type !== 'group') throw new Error('expected group node')
    expect(group.data.internalNodes.map((n) => n.id).sort()).toEqual([and.id, out.id].sort())
    // Two external inputs now wire into the group's two exposed input ports.
    expect(afterGroup.edges.filter((e) => e.target === group.id)).toHaveLength(2)

    useCircuitStore.getState().ungroup(group.id)
    const afterUngroup = useCircuitStore.getState()
    expect(afterUngroup.nodes.some((n) => n.type === 'group')).toBe(false)
    expect(afterUngroup.nodes).toHaveLength(4)
    expect(afterUngroup.edges).toHaveLength(3)
  })
})
