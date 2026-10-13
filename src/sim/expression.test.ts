import type { Edge } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import type { GateNode } from '../model/types'
import { computeExpressions } from './expression'

function gate(id: string, gateType: GateNode['data']['gateType'], label?: string): GateNode {
  return { id, type: 'gate', position: { x: 0, y: 0 }, data: { gateType, label } }
}

function wire(source: string, sourceHandle: string, target: string, targetHandle: string): Edge {
  return { id: `${source}-${target}`, source, sourceHandle, target, targetHandle }
}

describe('computeExpressions', () => {
  it('names INPUT gates by label, falling back to x1, x2, ...', () => {
    const nodes = [gate('a', 'INPUT', 'x'), gate('b', 'INPUT'), gate('c', 'INPUT', 'z')]
    const exprs = computeExpressions(nodes, [])
    expect(exprs.a).toEqual(['x'])
    expect(exprs.b).toEqual(['x2']) // unlabeled INPUT falls back to its position among inputs
    expect(exprs.c).toEqual(['z'])
  })

  it('builds a combined expression through NOT(AND(x, y))', () => {
    const nodes = [
      gate('x', 'INPUT', 'x'),
      gate('y', 'INPUT', 'y'),
      gate('and', 'AND'),
      gate('not', 'NOT'),
      gate('out', 'OUTPUT'),
    ]
    const edges = [
      wire('x', 'out', 'and', 'a'),
      wire('y', 'out', 'and', 'b'),
      wire('and', 'out', 'not', 'a'),
      wire('not', 'out', 'out', 'a'),
    ]

    const exprs = computeExpressions(nodes, edges)
    expect(exprs.and).toEqual(['(x·y)'])
    expect(exprs.not).toEqual(["(x·y)'"])
    // The wire feeding OUTPUT carries the full expression.
    expect(exprs.out).toEqual(["(x·y)'"])
  })

  it('labels a wire leaving an INPUT directly with its bare variable name', () => {
    const nodes = [gate('x', 'INPUT', 'x'), gate('not', 'NOT')]
    const edges = [wire('x', 'out', 'not', 'a')]
    const exprs = computeExpressions(nodes, edges)
    expect(exprs.x).toEqual(['x'])
  })

  it('primes a bare variable without wrapping it in parens', () => {
    const nodes = [gate('x', 'INPUT', 'x'), gate('not', 'NOT')]
    const edges = [wire('x', 'out', 'not', 'a')]
    const exprs = computeExpressions(nodes, edges)
    expect(exprs.not).toEqual(["x'"])
  })

  it('treats an unconnected input port as the constant 0', () => {
    const exprs = computeExpressions([gate('g', 'OR')], [])
    expect(exprs.g).toEqual(['(0+0)'])
  })

  it('marks a pure combinational feedback loop with a cycle marker instead of hanging', () => {
    const nodes = [gate('a', 'NOT'), gate('b', 'NOT')]
    const edges = [wire('a', 'out', 'b', 'a'), wire('b', 'out', 'a', 'a')]
    const exprs = computeExpressions(nodes, edges)
    expect(exprs.a).toEqual(['⟲'])
    expect(exprs.b).toEqual(['⟲'])
  })
})
