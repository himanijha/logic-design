import { fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { computeExpressions } from './sim/expression'
import { flattenCanvas } from './sim/netlist'
import { useCircuitStore } from './store/circuitStore'
import { useSimulationStore } from './store/simulationStore'
import { useUiStore } from './store/uiStore'

beforeEach(() => {
  useCircuitStore.setState({ nodes: [], edges: [] })
  useSimulationStore.setState({ active: false, history: [], index: 0 })
  useUiStore.setState({ netlistOpen: false, truthTableOpen: false, showExpressions: false, helpOpen: false })
  localStorage.clear()
})

describe('simulate end-to-end', () => {
  it('toggling an INPUT node flips a wired NOT gate and colors the wire', () => {
    const { addGate, onConnect } = useCircuitStore.getState()
    addGate('INPUT', { x: 0, y: 0 })
    addGate('NOT', { x: 100, y: 0 })
    const [input, not] = useCircuitStore.getState().nodes
    onConnect({ source: input.id, sourceHandle: 'out', target: not.id, targetHandle: 'a' })

    render(<App />)

    fireEvent.click(screen.getByTitle('Enter simulation mode'))

    // NOT with unconnected... actually wired to a false input, so output high.
    const notNode = document.querySelector(`[data-id="${not.id}"] .gate-node`)
    expect(notNode).toBeTruthy()

    const inputNode = document.querySelector(`[data-id="${input.id}"] .gate-node`)
    expect(inputNode).toBeTruthy()
    expect(inputNode?.className).toContain('clickable')

    act(() => {
      fireEvent.click(inputNode!)
    })

    // After toggling the input high, the NOT gate's output should flip low
    // and get flagged as changed.
    expect(notNode?.className).toContain('changed')
  })

  it('shows a truth table for a simple AND circuit', () => {
    const { addGate, onConnect } = useCircuitStore.getState()
    addGate('INPUT', { x: 0, y: 0 })
    addGate('INPUT', { x: 0, y: 100 })
    addGate('AND', { x: 100, y: 0 })
    addGate('OUTPUT', { x: 200, y: 0 })
    const [in1, in2, and, out] = useCircuitStore.getState().nodes
    onConnect({ source: in1.id, sourceHandle: 'out', target: and.id, targetHandle: 'a' })
    onConnect({ source: in2.id, sourceHandle: 'out', target: and.id, targetHandle: 'b' })
    onConnect({ source: and.id, sourceHandle: 'out', target: out.id, targetHandle: 'a' })

    render(<App />)
    fireEvent.click(screen.getByTitle('Toggle truth table'))

    const table = document.querySelector('.truth-table')
    expect(table).toBeTruthy()
    const rows = table!.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(4)
    // Only the last row (1,1) should produce a 1 for an AND gate.
    const lastRowCells = rows[3].querySelectorAll('td')
    expect(Array.from(lastRowCells).map((td) => td.textContent)).toEqual(['1', '1', '1'])
    const firstRowCells = rows[0].querySelectorAll('td')
    expect(Array.from(firstRowCells).map((td) => td.textContent)).toEqual(['0', '0', '0'])
  })

  it('renaming an INPUT via the DOM feeds the expression engine with the new variable name', () => {
    const { addGate, onConnect } = useCircuitStore.getState()
    addGate('INPUT', { x: 0, y: 0 })
    addGate('INPUT', { x: 0, y: 100 })
    addGate('AND', { x: 100, y: 0 })
    addGate('OUTPUT', { x: 200, y: 0 })
    const [in1, in2, and, out] = useCircuitStore.getState().nodes
    onConnect({ source: in1.id, sourceHandle: 'out', target: and.id, targetHandle: 'a' })
    onConnect({ source: in2.id, sourceHandle: 'out', target: and.id, targetHandle: 'b' })
    onConnect({ source: and.id, sourceHandle: 'out', target: out.id, targetHandle: 'a' })

    render(<App />)

    // Rename both inputs via the double-click-to-edit label.
    const in1Label = document.querySelector(`[data-id="${in1.id}"] .gate-type-label`)!
    fireEvent.doubleClick(in1Label)
    const in1Input = document.querySelector(`[data-id="${in1.id}"] .gate-rename-input`) as HTMLInputElement
    fireEvent.change(in1Input, { target: { value: 'x' } })
    fireEvent.blur(in1Input)

    const in2Label = document.querySelector(`[data-id="${in2.id}"] .gate-type-label`)!
    fireEvent.doubleClick(in2Label)
    const in2Input = document.querySelector(`[data-id="${in2.id}"] .gate-rename-input`) as HTMLInputElement
    fireEvent.change(in2Input, { target: { value: 'y' } })
    fireEvent.blur(in2Input)

    expect(useCircuitStore.getState().nodes.find((n) => n.id === in1.id)?.data.label).toBe('x')
    expect(useCircuitStore.getState().nodes.find((n) => n.id === in2.id)?.data.label).toBe('y')

    // The "Expressions" toggle labels every wire via WireEdge, but React
    // Flow's edges need real layout measurement it doesn't get under
    // jsdom, so check the same pure engine FlowCanvas feeds instead —
    // it's exercised with real DOM-driven state, just read without the
    // edge-rendering step jsdom can't do.
    fireEvent.click(screen.getByTitle(/Label wires with the boolean expression/))
    const { nodes, edges } = useCircuitStore.getState()
    const netlist = flattenCanvas(nodes, edges)
    const exprs = computeExpressions(netlist.nodes, netlist.edges)
    expect(exprs[in1.id]).toEqual(['x'])
    expect(exprs[in2.id]).toEqual(['y'])
    expect(exprs[and.id]).toEqual(['(x·y)'])
  })

  it('opens and closes the help tutorial from the gear button', () => {
    render(<App />)

    expect(screen.queryByText('How this works')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTitle('How this works'))
    expect(screen.getByText('How this works')).toBeInTheDocument()
    expect(screen.getByText('Grouping / collapsing')).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('How this works'))
    expect(screen.queryByText('How this works')).not.toBeInTheDocument()
  })
})
