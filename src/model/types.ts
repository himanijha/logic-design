import type { Edge, Node } from '@xyflow/react'
import type { GateType } from './gates'

/** Data carried on a React Flow node that represents a single gate. */
export interface GateNodeData {
  gateType: GateType
  /** User-editable label override (defaults to the gate type's label). */
  label?: string
  [key: string]: unknown
}

export type GateNode = Node<GateNodeData, 'gate'>

/** Maps one exposed port on a collapsed group to the port of a gate inside it. */
export interface GroupPortMapping {
  /** Port id exposed on the group node's own handle. */
  portId: string
  label: string
  internalGateId: string
  internalPortId: string
}

/** Data carried on a React Flow node that represents a collapsed group of
 * gates. The group's own gates/wires are stashed here while collapsed;
 * expanding re-inserts them into the canvas and deletes this node. */
export interface GroupNodeData {
  label: string
  internalNodes: GateNode[]
  internalEdges: Edge[]
  inputs: GroupPortMapping[]
  outputs: GroupPortMapping[]
  [key: string]: unknown
}

export type GroupNode = Node<GroupNodeData, 'group'>

export type CanvasNode = GateNode | GroupNode

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
