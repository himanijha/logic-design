// Pure circuit-model definitions. No React/React Flow imports here —
// this is the vocabulary the simulation engine will consume later.

export type GateType =
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'XOR'
  | 'NAND'
  | 'NOR'
  | 'XNOR'
  | 'INPUT'
  | 'OUTPUT'
  | 'CLOCK'
  | 'DFF'
  | 'MUX2'
  | 'MUX4'

export interface PortSpec {
  id: string
  label: string
}

export interface GateSpec {
  type: GateType
  label: string
  inputs: PortSpec[]
  outputs: PortSpec[]
  /** Pure boolean evaluation, used by the simulation engine for
   * combinational gates. Ignored for `stateful` gates — their output comes
   * from the engine's register state instead (see sim/engine.ts). */
  evaluate: (inputs: boolean[]) => boolean[]
  /** True for gates whose output is a register updated by clock edges
   * (DFF) or by manual ticking (CLOCK), not by instantaneous combinational
   * evaluation. Lets the engine break feedback loops at the right points. */
  stateful?: boolean
}

const bin = (fn: (a: boolean, b: boolean) => boolean) => (inputs: boolean[]) => [
  fn(Boolean(inputs[0]), Boolean(inputs[1])),
]

export const GATE_SPECS: Record<GateType, GateSpec> = {
  AND: {
    type: 'AND',
    label: 'AND',
    inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    outputs: [{ id: 'out', label: 'OUT' }],
    evaluate: bin((a, b) => a && b),
  },
  OR: {
    type: 'OR',
    label: 'OR',
    inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    outputs: [{ id: 'out', label: 'OUT' }],
    evaluate: bin((a, b) => a || b),
  },
  NOT: {
    type: 'NOT',
    label: 'NOT',
    inputs: [{ id: 'a', label: 'A' }],
    outputs: [{ id: 'out', label: 'OUT' }],
    evaluate: (inputs) => [!inputs[0]],
  },
  XOR: {
    type: 'XOR',
    label: 'XOR',
    inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    outputs: [{ id: 'out', label: 'OUT' }],
    evaluate: bin((a, b) => a !== b),
  },
  NAND: {
    type: 'NAND',
    label: 'NAND',
    inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    outputs: [{ id: 'out', label: 'OUT' }],
    evaluate: bin((a, b) => !(a && b)),
  },
  NOR: {
    type: 'NOR',
    label: 'NOR',
    inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    outputs: [{ id: 'out', label: 'OUT' }],
    evaluate: bin((a, b) => !(a || b)),
  },
  XNOR: {
    type: 'XNOR',
    label: 'XNOR',
    inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    outputs: [{ id: 'out', label: 'OUT' }],
    evaluate: bin((a, b) => a === b),
  },
  INPUT: {
    type: 'INPUT',
    label: 'IN',
    inputs: [],
    outputs: [{ id: 'out', label: 'OUT' }],
    evaluate: () => [false],
  },
  OUTPUT: {
    type: 'OUTPUT',
    label: 'OUT',
    inputs: [{ id: 'a', label: 'A' }],
    outputs: [],
    evaluate: (inputs) => [Boolean(inputs[0])],
  },
  CLOCK: {
    type: 'CLOCK',
    label: 'CLK',
    inputs: [],
    outputs: [{ id: 'clk', label: 'CLK' }],
    evaluate: () => [false],
    stateful: true,
  },
  DFF: {
    type: 'DFF',
    label: 'DFF',
    inputs: [{ id: 'd', label: 'D' }, { id: 'clk', label: 'CLK' }],
    outputs: [{ id: 'q', label: 'Q' }],
    evaluate: (inputs) => [Boolean(inputs[0])],
    stateful: true,
  },
  MUX2: {
    type: 'MUX2',
    label: 'MUX2',
    inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'sel', label: 'S' }],
    outputs: [{ id: 'out', label: 'OUT' }],
    evaluate: ([a, b, sel]) => [sel ? Boolean(b) : Boolean(a)],
  },
  MUX4: {
    type: 'MUX4',
    label: 'MUX4',
    inputs: [
      { id: 'd0', label: 'D0' },
      { id: 'd1', label: 'D1' },
      { id: 'd2', label: 'D2' },
      { id: 'd3', label: 'D3' },
      { id: 's0', label: 'S0' },
      { id: 's1', label: 'S1' },
    ],
    outputs: [{ id: 'out', label: 'OUT' }],
    evaluate: ([d0, d1, d2, d3, s0, s1]) => {
      const index = (s1 ? 2 : 0) + (s0 ? 1 : 0)
      return [Boolean([d0, d1, d2, d3][index])]
    },
  },
}

export const GATE_TYPES: GateType[] = Object.keys(GATE_SPECS) as GateType[]

export const PALETTE_GATE_TYPES: GateType[] = [
  'INPUT',
  'OUTPUT',
  'AND',
  'OR',
  'NOT',
  'XOR',
  'NAND',
  'NOR',
  'XNOR',
  'CLOCK',
  'DFF',
  'MUX2',
  'MUX4',
]
