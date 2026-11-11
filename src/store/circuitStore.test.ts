import { beforeEach, describe, expect, it } from 'vitest'
import type { GroupNode } from '../model/types'
import { EMPTY_SIM_STATE, settle } from '../sim/engine'
import { flattenCanvas } from '../sim/netlist'
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

describe('circuitStore labels', () => {
  it('names new inputs A, B, C… and reuses a name freed by renaming', () => {
    const { addGate, renameGate } = useCircuitStore.getState()
    addGate('INPUT', { x: 0, y: 0 })
    addGate('INPUT', { x: 0, y: 100 })
    addGate('AND', { x: 200, y: 50 })

    const [a, b, and] = useCircuitStore.getState().nodes
    expect(a.data.label).toBe('A')
    expect(b.data.label).toBe('B')
    expect(and.data.label).toBeUndefined()

    renameGate(a.id, 'x')
    addGate('INPUT', { x: 0, y: 200 })
    expect(useCircuitStore.getState().nodes[3].data.label).toBe('A')
  })

  it('sets and clears a wire label', () => {
    const { addGate, onConnect } = useCircuitStore.getState()
    addGate('INPUT', { x: 0, y: 0 })
    addGate('OUTPUT', { x: 200, y: 0 })
    const [input, output] = useCircuitStore.getState().nodes
    onConnect({ source: input.id, sourceHandle: 'out', target: output.id, targetHandle: 'a' })

    const wire = useCircuitStore.getState().edges[0]
    useCircuitStore.getState().renameWire(wire.id, '  carry ')
    expect(useCircuitStore.getState().edges[0].data?.label).toBe('carry')

    useCircuitStore.getState().renameWire(wire.id, '   ')
    expect(useCircuitStore.getState().edges[0].data?.label).toBeUndefined()
  })
})

describe('circuitStore copy/paste', () => {
  it('pastes a collapsed block that simulates independently of the original', () => {
    const { addGate, onConnect } = useCircuitStore.getState()
    addGate('INPUT', { x: 0, y: 0 })
    addGate('INPUT', { x: 0, y: 100 })
    addGate('AND', { x: 200, y: 50 })
    addGate('NOT', { x: 300, y: 50 })
    addGate('OUTPUT', { x: 500, y: 50 })
    const [a, b, and, not, out1] = useCircuitStore.getState().nodes
    onConnect({ source: a.id, sourceHandle: 'out', target: and.id, targetHandle: 'a' })
    onConnect({ source: b.id, sourceHandle: 'out', target: and.id, targetHandle: 'b' })
    onConnect({ source: and.id, sourceHandle: 'out', target: not.id, targetHandle: 'a' })
    onConnect({ source: not.id, sourceHandle: 'out', target: out1.id, targetHandle: 'a' })

    const select = (ids: string[]) =>
      useCircuitStore.setState({ nodes: useCircuitStore.getState().nodes.map((n) => ({ ...n, selected: ids.includes(n.id) })) })
    select([and.id, not.id])
    useCircuitStore.getState().groupSelected()
    const original = useCircuitStore.getState().nodes.find((n) => n.type === 'group')!

    select([original.id])
    expect(useCircuitStore.getState().copySelected()).toBe(true)
    expect(useCircuitStore.getState().pasteClipboard()).toBe(true)
    expect(useCircuitStore.getState().pasteClipboard()).toBe(true)

    const groups = useCircuitStore.getState().nodes.filter((n): n is GroupNode => n.type === 'group')
    expect(groups).toHaveLength(3)
    expect(groups[1].position).not.toEqual(groups[2].position)
    expect(groups.map((g) => g.data.label)).toEqual(['Group', 'Group', 'Group'])

    // Every internal gate id is unique across the whole canvas once flattened.
    const flatIds = flattenCanvas(useCircuitStore.getState().nodes, useCircuitStore.getState().edges).nodes.map((n) => n.id)
    expect(new Set(flatIds).size).toBe(flatIds.length)

    // Drive the first pasted copy from its own inputs and output.
    const copy = groups[1]
    addGate('INPUT', { x: 0, y: 300 })
    addGate('INPUT', { x: 0, y: 400 })
    addGate('OUTPUT', { x: 500, y: 350 })
    const [c, d, out2] = useCircuitStore.getState().nodes.slice(-3)
    onConnect({ source: c.id, sourceHandle: 'out', target: copy.id, targetHandle: copy.data.inputs[0].portId })
    onConnect({ source: d.id, sourceHandle: 'out', target: copy.id, targetHandle: copy.data.inputs[1].portId })
    onConnect({ source: copy.id, sourceHandle: copy.data.outputs[0].portId, target: out2.id, targetHandle: 'a' })

    const flat = flattenCanvas(useCircuitStore.getState().nodes, useCircuitStore.getState().edges)
    const result = settle(flat.nodes, flat.edges, { ...EMPTY_SIM_STATE, inputs: { [a.id]: true, [b.id]: true, [c.id]: false, [d.id]: false } })
    expect(result.outputs[out1.id][0]).toBe(false) // NOT(1 AND 1)
    expect(result.outputs[out2.id][0]).toBe(true) // NOT(0 AND 0)
  })

  it('reports nothing copied when the selection is empty', () => {
    expect(useCircuitStore.getState().copySelected()).toBe(false)
  })
})
