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

export interface PortSpec {
  id: string
  label: string
}

export interface GateSpec {
  type: GateType
  label: string
  inputs: PortSpec[]
  outputs: PortSpec[]
  /** Pure boolean evaluation, used by the (future) simulation engine. */
  evaluate: (inputs: boolean[]) => boolean[]
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
]
