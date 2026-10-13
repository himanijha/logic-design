import type { Node } from '@xyflow/react'
import type { GateType } from './gates'

/** Data carried on a React Flow node that represents a single gate. */
export interface GateNodeData {
  gateType: GateType
  /** User-editable label override (defaults to the gate type's label). */
  label?: string
  [key: string]: unknown
}

export type GateNode = Node<GateNodeData, 'gate'>

/** Plain-object circuit shape used for save/export (JSON) and for the
 * simulation engine, decoupled from React Flow's node/edge shapes. */
export interface CircuitGate {
  id: string
  type: GateType
  label?: string
  position: { x: number; y: number }
}

export interface CircuitWire {
  id: string
  sourceGateId: string
  sourcePortId: string
  targetGateId: string
  targetPortId: string
}

export interface CircuitDocument {
  version: 1
  gates: CircuitGate[]
  wires: CircuitWire[]
}
