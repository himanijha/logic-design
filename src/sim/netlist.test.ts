import type { Edge } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import type { CanvasNode, GateNode, GroupNode } from '../model/types'
import { flattenCanvas } from './netlist'

function gate(id: string, gateType: GateNode['data']['gateType']): GateNode {
  return { id, type: 'gate', position: { x: 0, y: 0 }, data: { gateType } }
}

function wire(source: string, sourceHandle: string, target: string, targetHandle: string): Edge {
  return { id: `${source}-${target}`, source, sourceHandle, target, targetHandle }
}

describe('flattenCanvas', () => {
  it('passes through a canvas with no groups unchanged', () => {
    const nodes: CanvasNode[] = [gate('a', 'INPUT'), gate('b', 'NOT')]
    const edges = [wire('a', 'out', 'b', 'a')]
    const flat = flattenCanvas(nodes, edges)
    expect(flat.nodes.map((n) => n.id).sort()).toEqual(['a', 'b'])
    expect(flat.edges).toHaveLength(1)
  })

  it('inlines a group and rewrites boundary edges to its internal ports', () => {
    const outside1 = gate('outside1', 'INPUT')
    const outside2 = gate('outside2', 'OUTPUT')

    const group: GroupNode = {
      id: 'g1',
      type: 'group',
      position: { x: 100, y: 100 },
      data: {
        label: 'Group',
        internalNodes: [gate('inner-and', 'AND')],
        internalEdges: [],
        inputs: [
          { portId: 'in0', label: 'A', internalGateId: 'inner-and', internalPortId: 'a' },
          { portId: 'in1', label: 'B', internalGateId: 'inner-and', internalPortId: 'b' },
        ],
        outputs: [
          { portId: 'out0', label: 'OUT', internalGateId: 'inner-and', internalPortId: 'out' },
        ],
      },
    }

    const nodes: CanvasNode[] = [outside1, outside2, group]
    const edges: Edge[] = [
      wire('outside1', 'out', 'g1', 'in0'),
      wire('g1', 'out0', 'outside2', 'a'),
    ]

    const flat = flattenCanvas(nodes, edges)

    expect(flat.nodes.map((n) => n.id).sort()).toEqual(['inner-and', 'outside1', 'outside2'])

    const inEdge = flat.edges.find((e) => e.source === 'outside1')
    expect(inEdge).toMatchObject({ target: 'inner-and', targetHandle: 'a' })

    const outEdge = flat.edges.find((e) => e.target === 'outside2')
    expect(outEdge).toMatchObject({ source: 'inner-and', sourceHandle: 'out' })

    expect(flat.resolveGroupPort('g1', 'in0')).toEqual({ gateId: 'inner-and', portId: 'a' })
    expect(flat.resolveGroupPort('g1', 'out0')).toEqual({ gateId: 'inner-and', portId: 'out' })
  })
})
