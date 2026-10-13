import type { Edge } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import type { GateNode } from '../model/types'
import { advance, EMPTY_SIM_STATE, settle } from './engine'

function gate(id: string, gateType: GateNode['data']['gateType']): GateNode {
  return { id, type: 'gate', position: { x: 0, y: 0 }, data: { gateType } }
}

function wire(source: string, sourceHandle: string, target: string, targetHandle: string): Edge {
  return { id: `${source}-${target}`, source, sourceHandle, target, targetHandle }
}

describe('settle (combinational)', () => {
  it('propagates an AND gate fed by two inputs', () => {
    const nodes = [gate('in1', 'INPUT'), gate('in2', 'INPUT'), gate('and', 'AND'), gate('out', 'OUTPUT')]
    const edges = [
      wire('in1', 'out', 'and', 'a'),
      wire('in2', 'out', 'and', 'b'),
      wire('and', 'out', 'out', 'a'),
    ]

    const off = settle(nodes, edges, EMPTY_SIM_STATE)
    expect(off.outputs.and).toEqual([false])
    expect(off.outputs.out).toEqual([false])

    const bothHigh = settle(nodes, edges, { ...EMPTY_SIM_STATE, inputs: { in1: true, in2: true } })
    expect(bothHigh.outputs.and).toEqual([true])
    expect(bothHigh.outputs.out).toEqual([true])
  })

  it('leaves an unconnected input port as false', () => {
    const nodes = [gate('not', 'NOT')]
    const result = settle(nodes, [], EMPTY_SIM_STATE)
    expect(result.outputs.not).toEqual([true])
  })

  it('flags a pure combinational feedback loop as cyclic instead of hanging', () => {
    const nodes = [gate('a', 'NOT'), gate('b', 'NOT')]
    const edges = [wire('a', 'out', 'b', 'a'), wire('b', 'out', 'a', 'a')]
    const result = settle(nodes, edges, EMPTY_SIM_STATE)
    expect(result.cyclicGateIds.sort()).toEqual(['a', 'b'])
  })
})

describe('advance (sequential)', () => {
  it('latches D into a DFF only on a rising clock edge', () => {
    const nodes = [gate('d', 'INPUT'), gate('clk', 'INPUT'), gate('dff', 'DFF')]
    const edges = [wire('d', 'out', 'dff', 'd'), wire('clk', 'out', 'dff', 'clk')]

    let state = EMPTY_SIM_STATE
    let outputs = settle(nodes, edges, state).outputs

    // D=true, CLK still low: no latch yet.
    state = { ...state, inputs: { d: true, clk: false } }
    let result = advance(nodes, edges, state, outputs)
    state = result.state
    outputs = result.outputs
    expect(outputs.dff).toEqual([false])

    // Rising edge with D=true: latches.
    state = { ...state, inputs: { d: true, clk: true } }
    result = advance(nodes, edges, state, outputs)
    state = result.state
    outputs = result.outputs
    expect(outputs.dff).toEqual([true])
    expect(result.changedGateIds).toContain('dff')

    // D changes while clock stays high: no re-latch until next edge.
    state = { ...state, inputs: { d: false, clk: true } }
    result = advance(nodes, edges, state, outputs)
    expect(result.outputs.dff).toEqual([true])

    // Falling edge: still holds.
    state = { ...result.state, inputs: { d: false, clk: false } }
    result = advance(nodes, edges, state, result.outputs)
    expect(result.outputs.dff).toEqual([true])

    // Next rising edge with D=false: latches false.
    state = { ...result.state, inputs: { d: false, clk: true } }
    result = advance(nodes, edges, state, result.outputs)
    expect(result.outputs.dff).toEqual([false])
  })

  it('a CLOCK gate toggled via its register drives a DFF', () => {
    const nodes = [gate('clk', 'CLOCK'), gate('d', 'INPUT'), gate('dff', 'DFF')]
    const edges = [wire('clk', 'clk', 'dff', 'clk'), wire('d', 'out', 'dff', 'd')]

    let state = { ...EMPTY_SIM_STATE, inputs: { d: true } }
    let outputs = settle(nodes, edges, state).outputs

    state = { ...state, registers: { clk: true } }
    const result = advance(nodes, edges, state, outputs)
    expect(result.outputs.dff).toEqual([true])
  })
})
