import type { Edge } from '@xyflow/react'
import { GATE_SPECS, type GateType } from '../model/gates'
import type { CanvasNode, GateNode } from '../model/types'
import { flattenCanvas, type FlatNetlist } from './netlist'

/** One symbolic expression string per output port, keyed by gate id. */
export type ExprMap = Record<string, string[]>

function wireFeeding(edges: Edge[], gateId: string, portId: string): Edge | undefined {
  return edges.find((e) => e.target === gateId && e.targetHandle === portId)
}

function isSourceType(type: GateType): boolean {
  return type === 'INPUT' || type === 'CLOCK' || type === 'DFF'
}

const BARE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Complements an expression using postfix prime notation (x', (x·y)'),
 * only adding parens when the input isn't already a bare variable or
 * already wrapped in its own parens. */
function primeOf(expr: string): string {
  const alreadyAtomic = BARE_IDENTIFIER.test(expr) || (expr.startsWith('(') && expr.endsWith(')'))
  return alreadyAtomic ? `${expr}'` : `(${expr})'`
}

function formatExpr(type: GateType, inputs: string[]): string {
  switch (type) {
    case 'AND':
      return `(${inputs[0]}·${inputs[1]})`
    case 'OR':
      return `(${inputs[0]}+${inputs[1]})`
    case 'NOT':
      return primeOf(inputs[0])
    case 'XOR':
      return `(${inputs[0]}⊕${inputs[1]})`
    case 'NAND':
      return primeOf(`(${inputs[0]}·${inputs[1]})`)
    case 'NOR':
      return primeOf(`(${inputs[0]}+${inputs[1]})`)
    case 'XNOR':
      return primeOf(`(${inputs[0]}⊕${inputs[1]})`)
    case 'OUTPUT':
      return inputs[0]
    case 'MUX2': {
      const [a, b, sel] = inputs
      return `(${primeOf(sel)}·${a}+${sel}·${b})`
    }
    case 'MUX4': {
      const [d0, d1, d2, d3, s0, s1] = inputs
      const s0p = primeOf(s0)
      const s1p = primeOf(s1)
      return `(${s1p}${s0p}·${d0}+${s1p}${s0}·${d1}+${s1}${s0p}·${d2}+${s1}${s0}·${d3})`
    }
    default:
      return inputs[0] ?? '?'
  }
}

/**
 * Walks the (flattened) netlist in topological order and builds up a
 * symbolic boolean expression per gate output, using each INPUT gate's
 * label as its variable name. Every wire's expression is just the
 * expression of whatever drives it — so the wire feeding an OUTPUT gate
 * naturally carries the full built-up expression.
 *
 * CLOCK and DFF outputs are treated as opaque sources (labeled with their
 * own name/"Q") since a flip-flop's value depends on history, not a pure
 * function of the current inputs.
 */
export function computeExpressions(nodes: GateNode[], edges: Edge[]): ExprMap {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const exprs: ExprMap = {}

  let inputCount = 0
  for (const node of nodes) {
    if (node.data.gateType === 'INPUT') {
      inputCount += 1
      exprs[node.id] = [node.data.label ?? `x${inputCount}`]
    } else if (node.data.gateType === 'CLOCK') {
      exprs[node.id] = [node.data.label ?? 'CLK']
    } else if (node.data.gateType === 'DFF') {
      exprs[node.id] = [node.data.label ?? 'Q']
    }
  }

  const isSource = (gateId: string) => isSourceType(byId.get(gateId)!.data.gateType)
  const combinational = nodes.filter((n) => !isSource(n.id))
  const inDegree = new Map<string, number>()
  for (const gate of combinational) {
    const spec = GATE_SPECS[gate.data.gateType]
    let degree = 0
    for (const port of spec.inputs) {
      const wire = wireFeeding(edges, gate.id, port.id)
      if (wire && !isSource(wire.source) && byId.has(wire.source)) degree++
    }
    inDegree.set(gate.id, degree)
  }

  const queue = combinational.filter((g) => inDegree.get(g.id) === 0)
  const resolved = new Set(nodes.filter((n) => isSource(n.id)).map((n) => n.id))
  const order: GateNode[] = []

  while (queue.length > 0) {
    const gate = queue.shift()!
    order.push(gate)
    resolved.add(gate.id)
    for (const other of combinational) {
      if (resolved.has(other.id) || order.includes(other)) continue
      const spec = GATE_SPECS[other.data.gateType]
      const dependsOnGate = spec.inputs.some((port) => wireFeeding(edges, other.id, port.id)?.source === gate.id)
      if (!dependsOnGate) continue
      const remaining = (inDegree.get(other.id) ?? 0) - 1
      inDegree.set(other.id, remaining)
      if (remaining === 0) queue.push(other)
    }
  }

  const readExpr = (gateId: string, portId: string): string => {
    const node = byId.get(gateId)
    if (!node) return '?'
    const spec = GATE_SPECS[node.data.gateType]
    const index = spec.outputs.findIndex((p) => p.id === portId)
    return exprs[gateId]?.[index] ?? '?'
  }

  for (const gate of order) {
    const spec = GATE_SPECS[gate.data.gateType]
    const inputExprs = spec.inputs.map((port) => {
      const wire = wireFeeding(edges, gate.id, port.id)
      return wire ? readExpr(wire.source, wire.sourceHandle ?? '') : '0'
    })
    exprs[gate.id] = [formatExpr(gate.data.gateType, inputExprs)]
  }

  // Gates left out of `order` sit in a pure combinational feedback loop.
  for (const gate of combinational) {
    if (!exprs[gate.id]) exprs[gate.id] = GATE_SPECS[gate.data.gateType].outputs.map(() => '⟲')
  }

  return exprs
}

function flatExprValue(exprs: ExprMap, netlist: FlatNetlist, gateId: string, portId: string): string {
  const gate = netlist.nodes.find((n) => n.id === gateId)
  if (!gate) return '?'
  const index = GATE_SPECS[gate.data.gateType].outputs.findIndex((p) => p.id === portId)
  return exprs[gateId]?.[index] ?? '?'
}

/** Expression on a top-level node's output port — a base gate's own, or
 * (for a collapsed group) whatever internal gate its port map exposes. */
export function nodeOutputExpr(
  nodes: CanvasNode[],
  netlist: FlatNetlist,
  exprs: ExprMap,
  nodeId: string,
  portId: string,
): string {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return '?'
  if (node.type === 'group') {
    const resolved = netlist.resolveGroupPort(nodeId, portId)
    return resolved ? flatExprValue(exprs, netlist, resolved.gateId, resolved.portId) : '?'
  }
  return flatExprValue(exprs, netlist, nodeId, portId)
}

/** Expression arriving at a top-level node's input port, traced back
 * through the driving wire to its source's output expression. */
export function nodeInputExpr(
  nodes: CanvasNode[],
  edges: Edge[],
  netlist: FlatNetlist,
  exprs: ExprMap,
  nodeId: string,
  portId: string,
): string {
  const wire = edges.find((e) => e.target === nodeId && e.targetHandle === portId)
  if (!wire || !wire.sourceHandle) return '0'
  return nodeOutputExpr(nodes, netlist, exprs, wire.source, wire.sourceHandle)
}

/** Convenience: flattens the canvas and computes expressions in one call. */
export function computeCanvasExpressions(nodes: CanvasNode[], edges: Edge[]) {
  const netlist = flattenCanvas(nodes, edges)
  const exprs = computeExpressions(netlist.nodes, netlist.edges)
  return { netlist, exprs }
}
