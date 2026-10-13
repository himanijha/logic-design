import type { Edge } from '@xyflow/react'
import { GATE_SPECS } from '../model/gates'
import type { CanvasNode } from '../model/types'
import type { OutputMap } from './engine'
import type { FlatNetlist } from './netlist'

function flatOutputValue(outputs: OutputMap, netlist: FlatNetlist, gateId: string, portId: string): boolean {
  const gate = netlist.nodes.find((n) => n.id === gateId)
  if (!gate) return false
  const spec = GATE_SPECS[gate.data.gateType]
  const index = spec.outputs.findIndex((p) => p.id === portId)
  return outputs[gateId]?.[index] ?? false
}

/** Value on an output port of a top-level canvas node — a base gate's own
 * output, or (if `nodeId` is a collapsed group) whatever internal gate the
 * group's port map says it is exposing. */
export function nodeOutputValue(
  nodes: CanvasNode[],
  netlist: FlatNetlist,
  outputs: OutputMap,
  nodeId: string,
  portId: string,
): boolean {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return false
  if (node.type === 'group') {
    const resolved = netlist.resolveGroupPort(nodeId, portId)
    if (!resolved) return false
    return flatOutputValue(outputs, netlist, resolved.gateId, resolved.portId)
  }
  return flatOutputValue(outputs, netlist, nodeId, portId)
}

/** Value arriving at an input port of a top-level canvas node, traced back
 * through the driving wire (if any) to its source's output value. */
export function nodeInputValue(
  nodes: CanvasNode[],
  edges: Edge[],
  netlist: FlatNetlist,
  outputs: OutputMap,
  nodeId: string,
  portId: string,
): boolean {
  const wire = edges.find((e) => e.target === nodeId && e.targetHandle === portId)
  if (!wire || !wire.sourceHandle) return false
  return nodeOutputValue(nodes, netlist, outputs, wire.source, wire.sourceHandle)
}
