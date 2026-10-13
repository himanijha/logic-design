import type { Edge } from '@xyflow/react'
import type { CanvasNode, GateNode } from '../model/types'
import { settle, type SimState } from './engine'
import { flattenCanvas } from './netlist'

export interface TruthTableRow {
  inputs: boolean[]
  outputs: boolean[]
}

export interface TruthTableResult {
  inputLabels: string[]
  outputLabels: string[]
  rows: TruthTableRow[]
  /** True if there were more input combinations than `maxRows` allowed. */
  truncated: boolean
  /** True if the circuit contains a CLOCK or DFF — the table below only
   * reflects their current register state, not every possible behavior. */
  hasSequential: boolean
}

const DEFAULT_MAX_ROWS = 256

/**
 * Enumerates every combination of the diagram's top-level INPUT gates and
 * reports what its top-level OUTPUT gates settle to for each one. Any
 * CLOCK/DFF register value is held fixed at whatever `baseState` carries
 * (normally the current simulation snapshot, or all-false if not running).
 */
export function computeTruthTable(
  nodes: CanvasNode[],
  edges: Edge[],
  baseState: SimState,
  maxRows: number = DEFAULT_MAX_ROWS,
): TruthTableResult {
  const flat = flattenCanvas(nodes, edges)
  const hasSequential = flat.nodes.some(
    (n) => n.data.gateType === 'CLOCK' || n.data.gateType === 'DFF',
  )

  const inputGates = nodes.filter(
    (n): n is GateNode => n.type === 'gate' && n.data.gateType === 'INPUT',
  )
  const outputGates = nodes.filter(
    (n): n is GateNode => n.type === 'gate' && n.data.gateType === 'OUTPUT',
  )

  const inputCount = inputGates.length
  const totalCombinations = 2 ** inputCount
  const rowCount = Math.min(totalCombinations, maxRows)
  const truncated = totalCombinations > maxRows

  const rows: TruthTableRow[] = []
  for (let mask = 0; mask < rowCount; mask++) {
    const inputs: Record<string, boolean> = {}
    const bits: boolean[] = []
    inputGates.forEach((gate, i) => {
      const bit = ((mask >> (inputCount - 1 - i)) & 1) === 1
      inputs[gate.id] = bit
      bits.push(bit)
    })

    const result = settle(flat.nodes, flat.edges, { ...baseState, inputs })
    const outputs = outputGates.map((gate) => result.outputs[gate.id]?.[0] ?? false)
    rows.push({ inputs: bits, outputs })
  }

  return {
    inputLabels: inputGates.map((g, i) => g.data.label ?? `IN${i + 1}`),
    outputLabels: outputGates.map((g, i) => g.data.label ?? `OUT${i + 1}`),
    rows,
    truncated,
    hasSequential,
  }
}
