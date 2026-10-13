import type { Edge } from '@xyflow/react'
import { GATE_SPECS, type GateType } from '../model/gates'
import type { GateNode } from '../model/types'

/** A gate's current output values, one boolean per output port, in the
 * order its GateSpec declares them. */
export type OutputMap = Record<string, boolean[]>

export interface SimState {
  /** INPUT gate toggle values, keyed by gate id. */
  inputs: Record<string, boolean>
  /** Register value for stateful gates (CLOCK, DFF), keyed by gate id. */
  registers: Record<string, boolean>
  /** Last-sampled CLK input per DFF, used to detect rising edges. */
  prevClk: Record<string, boolean>
}

export const EMPTY_SIM_STATE: SimState = { inputs: {}, registers: {}, prevClk: {} }

export interface SettleResult {
  outputs: OutputMap
  /** Gates whose output could not be resolved because they sit in a
   * combinational feedback loop with no register breaking it. */
  cyclicGateIds: string[]
}

function wireFeeding(edges: Edge[], gateId: string, portId: string): Edge | undefined {
  return edges.find((e) => e.target === gateId && e.targetHandle === portId)
}

function readPort(
  outputs: OutputMap,
  gateTypeOf: Map<string, GateType>,
  gateId: string,
  portId: string,
): boolean {
  const type = gateTypeOf.get(gateId)
  if (!type) return false
  const index = GATE_SPECS[type].outputs.findIndex((p) => p.id === portId)
  return outputs[gateId]?.[index] ?? false
}

function isSourceType(type: GateType): boolean {
  return type === 'INPUT' || type === 'CLOCK' || type === 'DFF'
}

/** One combinational settle pass: every non-stateful gate's output is
 * recomputed from its current inputs; stateful gates (INPUT/CLOCK/DFF)
 * just report their held state. Topologically ordered so a gate is only
 * evaluated once its upstream gates have been. */
export function settle(nodes: GateNode[], edges: Edge[], state: SimState): SettleResult {
  const gateTypeOf = new Map(nodes.map((n) => [n.id, n.data.gateType]))
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const outputs: OutputMap = {}

  const isSource = (gateId: string) => isSourceType(gateTypeOf.get(gateId)!)

  for (const node of nodes) {
    const { gateType } = node.data
    if (gateType === 'INPUT') {
      outputs[node.id] = [state.inputs[node.id] ?? false]
    } else if (gateType === 'CLOCK' || gateType === 'DFF') {
      outputs[node.id] = [state.registers[node.id] ?? false]
    }
  }

  // Kahn's algorithm over the combinational (non-source) gates only.
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
  const resolved = new Set<string>(nodes.filter((n) => isSource(n.id)).map((n) => n.id))
  const order: GateNode[] = []

  while (queue.length > 0) {
    const gate = queue.shift()!
    order.push(gate)
    resolved.add(gate.id)
    for (const other of combinational) {
      if (resolved.has(other.id) || order.includes(other)) continue
      const spec = GATE_SPECS[other.data.gateType]
      const dependsOnGate = spec.inputs.some((port) => {
        const wire = wireFeeding(edges, other.id, port.id)
        return wire?.source === gate.id
      })
      if (!dependsOnGate) continue
      const remaining = (inDegree.get(other.id) ?? 0) - 1
      inDegree.set(other.id, remaining)
      if (remaining === 0) queue.push(other)
    }
  }

  for (const gate of order) {
    const spec = GATE_SPECS[gate.data.gateType]
    const inputValues = spec.inputs.map((port) => {
      const wire = wireFeeding(edges, gate.id, port.id)
      if (!wire) return false
      return readPort(outputs, gateTypeOf, wire.source, wire.sourceHandle ?? '')
    })
    outputs[gate.id] = spec.evaluate(inputValues)
  }

  const cyclicGateIds = combinational.filter((g) => !resolved.has(g.id)).map((g) => g.id)
  for (const id of cyclicGateIds) {
    const spec = GATE_SPECS[byId.get(id)!.data.gateType]
    outputs[id] = spec.outputs.map(() => false)
  }

  return { outputs, cyclicGateIds }
}

export interface AdvanceResult extends SettleResult {
  state: SimState
  /** Gate ids whose output changed from the previous settle, for the
   * "what just changed" highlight. */
  changedGateIds: string[]
}

function diffOutputs(before: OutputMap, after: OutputMap): string[] {
  const changed: string[] = []
  for (const id of Object.keys(after)) {
    const a = before[id]
    const b = after[id]
    if (!a || a.length !== b.length || a.some((v, i) => v !== b[i])) changed.push(id)
  }
  return changed
}

/**
 * Runs one settle pass, then checks every DFF for a rising clock edge and
 * latches D into its register if one occurred, re-settling if any register
 * changed. Called after every user action (toggling an input, ticking a
 * clock) so a flip-flop wired to a manually-toggled input still clocks
 * correctly, not just one driven by a CLOCK gate.
 */
export function advance(
  nodes: GateNode[],
  edges: Edge[],
  prevState: SimState,
  prevOutputs: OutputMap,
): AdvanceResult {
  const gateTypeOf = new Map(nodes.map((n) => [n.id, n.data.gateType]))
  const first = settle(nodes, edges, prevState)
  const dffs = nodes.filter((n) => n.data.gateType === 'DFF')

  const newRegisters = { ...prevState.registers }
  const newPrevClk = { ...prevState.prevClk }
  let anyLatched = false

  for (const dff of dffs) {
    const clkWire = wireFeeding(edges, dff.id, 'clk')
    const clkValue = clkWire
      ? readPort(first.outputs, gateTypeOf, clkWire.source, clkWire.sourceHandle ?? '')
      : false
    const wasLow = !(prevState.prevClk[dff.id] ?? false)

    if (clkValue && wasLow) {
      const dWire = wireFeeding(edges, dff.id, 'd')
      const dValue = dWire
        ? readPort(first.outputs, gateTypeOf, dWire.source, dWire.sourceHandle ?? '')
        : false
      newRegisters[dff.id] = dValue
      anyLatched = true
    }
    newPrevClk[dff.id] = clkValue
  }

  const newState: SimState = { ...prevState, registers: newRegisters, prevClk: newPrevClk }
  const final = anyLatched ? settle(nodes, edges, newState) : first

  return {
    state: newState,
    outputs: final.outputs,
    cyclicGateIds: final.cyclicGateIds,
    changedGateIds: diffOutputs(prevOutputs, final.outputs),
  }
}
