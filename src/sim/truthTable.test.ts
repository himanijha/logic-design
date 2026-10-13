import type { Edge } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import type { GateNode } from '../model/types'
import { EMPTY_SIM_STATE } from './engine'
import { computeTruthTable } from './truthTable'

function gate(id: string, gateType: GateNode['data']['gateType'], label?: string): GateNode {
  return { id, type: 'gate', position: { x: 0, y: 0 }, data: { gateType, label } }
}

function wire(source: string, sourceHandle: string, target: string, targetHandle: string): Edge {
  return { id: `${source}-${target}`, source, sourceHandle, target, targetHandle }
}

describe('computeTruthTable', () => {
  it('enumerates all combinations for an AND gate', () => {
    const nodes = [
      gate('a', 'INPUT', 'A'),
      gate('b', 'INPUT', 'B'),
      gate('and', 'AND'),
      gate('out', 'OUTPUT', 'Y'),
    ]
    const edges = [
      wire('a', 'out', 'and', 'a'),
      wire('b', 'out', 'and', 'b'),
      wire('and', 'out', 'out', 'a'),
    ]

    const table = computeTruthTable(nodes, edges, EMPTY_SIM_STATE)
    expect(table.inputLabels).toEqual(['A', 'B'])
    expect(table.outputLabels).toEqual(['Y'])
    expect(table.rows).toHaveLength(4)
    expect(table.rows.map((r) => [...r.inputs, ...r.outputs])).toEqual([
      [false, false, false],
      [false, true, false],
      [true, false, false],
      [true, true, true],
    ])
    expect(table.truncated).toBe(false)
    expect(table.hasSequential).toBe(false)
  })

  it('flags sequential circuits and holds register state fixed across rows', () => {
    const nodes = [gate('d', 'INPUT', 'D'), gate('dff', 'DFF'), gate('out', 'OUTPUT', 'Q')]
    const edges = [wire('d', 'out', 'dff', 'd'), wire('dff', 'q', 'out', 'a')]

    const table = computeTruthTable(nodes, edges, { ...EMPTY_SIM_STATE, registers: { dff: true } })
    expect(table.hasSequential).toBe(true)
    // D toggling doesn't change Q within the table — only a clock edge would.
    expect(table.rows.map((r) => r.outputs[0])).toEqual([true, true])
  })

  it('truncates past the row cap', () => {
    const nodes = Array.from({ length: 10 }, (_, i) => gate(`in${i}`, 'INPUT'))
    const table = computeTruthTable(nodes, [], EMPTY_SIM_STATE, 16)
    expect(table.rows).toHaveLength(16)
    expect(table.truncated).toBe(true)
  })
})
