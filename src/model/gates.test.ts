import { describe, expect, it } from 'vitest'
import { GATE_SPECS } from './gates'

describe('gate truth tables', () => {
  it('AND', () => {
    expect(GATE_SPECS.AND.evaluate([false, false])).toEqual([false])
    expect(GATE_SPECS.AND.evaluate([true, false])).toEqual([false])
    expect(GATE_SPECS.AND.evaluate([true, true])).toEqual([true])
  })

  it('OR', () => {
    expect(GATE_SPECS.OR.evaluate([false, false])).toEqual([false])
    expect(GATE_SPECS.OR.evaluate([true, false])).toEqual([true])
  })

  it('NOT', () => {
    expect(GATE_SPECS.NOT.evaluate([true])).toEqual([false])
    expect(GATE_SPECS.NOT.evaluate([false])).toEqual([true])
  })

  it('XOR', () => {
    expect(GATE_SPECS.XOR.evaluate([true, true])).toEqual([false])
    expect(GATE_SPECS.XOR.evaluate([true, false])).toEqual([true])
  })

  it('NAND is the complement of AND', () => {
    expect(GATE_SPECS.NAND.evaluate([true, true])).toEqual([false])
    expect(GATE_SPECS.NAND.evaluate([true, false])).toEqual([true])
  })

  it('NOR is the complement of OR', () => {
    expect(GATE_SPECS.NOR.evaluate([false, false])).toEqual([true])
    expect(GATE_SPECS.NOR.evaluate([true, false])).toEqual([false])
  })

  it('XNOR is the complement of XOR', () => {
    expect(GATE_SPECS.XNOR.evaluate([true, true])).toEqual([true])
    expect(GATE_SPECS.XNOR.evaluate([true, false])).toEqual([false])
  })
})
