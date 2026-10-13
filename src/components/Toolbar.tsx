import { useReactFlow } from '@xyflow/react'
import { useRef } from 'react'
import { GATE_SPECS, type GateType } from '../model/gates'
import { exportToFile, importFromFile } from '../persistence'
import { useCircuitStore, useTemporalCircuitStore } from '../store/circuitStore'
import { useSimulationStore } from '../store/simulationStore'
import { useUiStore } from '../store/uiStore'

const COLS = 4
const COL_SPACING = 140
const ROW_SPACING = 90

const GATE_GROUPS: { label: string; types: GateType[] }[] = [
  { label: 'I/O', types: ['INPUT', 'OUTPUT'] },
  { label: 'Gates', types: ['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR', 'XNOR'] },
  { label: 'Mux', types: ['MUX2', 'MUX4'] },
  { label: 'Sequential', types: ['CLOCK', 'DFF'] },
]

export default function Toolbar() {
  const addGate = useCircuitStore((s) => s.addGate)
  const groupSelected = useCircuitStore((s) => s.groupSelected)
  const nodes = useCircuitStore((s) => s.nodes)
  const edges = useCircuitStore((s) => s.edges)
  const loadCircuit = useCircuitStore((s) => s.loadCircuit)
  const { screenToFlowPosition } = useReactFlow()
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Monotonic — unlike nodes.length, this never goes back down after a
  // delete, so a newly placed gate can't land on top of a surviving one.
  const placedCount = useRef(0)

  const undo = useTemporalCircuitStore((s) => s.undo)
  const redo = useTemporalCircuitStore((s) => s.redo)
  const pastCount = useTemporalCircuitStore((s) => s.pastStates.length)
  const futureCount = useTemporalCircuitStore((s) => s.futureStates.length)

  const simActive = useSimulationStore((s) => s.active)
  const enterSim = useSimulationStore((s) => s.enter)
  const exitSim = useSimulationStore((s) => s.exit)
  const stepBack = useSimulationStore((s) => s.stepBack)
  const stepForward = useSimulationStore((s) => s.stepForward)
  const resetSim = useSimulationStore((s) => s.reset)
  const simIndex = useSimulationStore((s) => s.index)
  const simHistoryLength = useSimulationStore((s) => s.history.length)

  const netlistOpen = useUiStore((s) => s.netlistOpen)
  const toggleNetlist = useUiStore((s) => s.toggleNetlist)
  const truthTableOpen = useUiStore((s) => s.truthTableOpen)
  const toggleTruthTable = useUiStore((s) => s.toggleTruthTable)
  const showExpressions = useUiStore((s) => s.showExpressions)
  const toggleShowExpressions = useUiStore((s) => s.toggleShowExpressions)

  const selectedCount = nodes.filter((n) => n.selected).length

  function handleAddGate(gateType: GateType) {
    const index = placedCount.current++
    const col = index % COLS
    const row = Math.floor(index / COLS)
    const position = screenToFlowPosition({
      x: 240 + col * COL_SPACING,
      y: 160 + row * ROW_SPACING,
    })
    addGate(gateType, position)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const doc = await importFromFile(file)
    if (doc) {
      exitSim()
      loadCircuit({ nodes: doc.nodes, edges: doc.edges })
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        {GATE_GROUPS.map((group, i) => (
          <div className="toolbar-group" key={group.label}>
            {i > 0 && <span className="toolbar-divider" />}
            <span className="toolbar-group-label">{group.label}</span>
            {group.types.map((gateType) => (
              <button
                key={gateType}
                type="button"
                className="toolbar-button"
                onClick={() => handleAddGate(gateType)}
                disabled={simActive}
                title={`Add ${GATE_SPECS[gateType].label} gate`}
              >
                {GATE_SPECS[gateType].label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="toolbar-row">
        <div className="toolbar-group">
          <button type="button" className="toolbar-button" onClick={() => undo()} disabled={pastCount === 0 || simActive} title="Undo (Ctrl+Z)">
            Undo
          </button>
          <button type="button" className="toolbar-button" onClick={() => redo()} disabled={futureCount === 0 || simActive} title="Redo (Ctrl+Shift+Z)">
            Redo
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => groupSelected()}
            disabled={selectedCount < 2 || simActive}
            title="Group selected gates (Ctrl+G)"
          >
            Group
          </button>
        </div>

        <span className="toolbar-divider" />

        <div className="toolbar-group">
          {!simActive ? (
            <button type="button" className="toolbar-button" onClick={() => enterSim()} title="Enter simulation mode">
              ▶ Simulate
            </button>
          ) : (
            <>
              <button type="button" className="toolbar-button" onClick={() => exitSim()} title="Back to editing">
                ■ Stop
              </button>
              <button type="button" className="toolbar-button" onClick={() => stepBack()} disabled={simIndex === 0} title="Step back">
                ◀
              </button>
              <span className="toolbar-button" style={{ cursor: 'default' }}>
                {simIndex + 1}/{simHistoryLength}
              </span>
              <button
                type="button"
                className="toolbar-button"
                onClick={() => stepForward()}
                disabled={simIndex >= simHistoryLength - 1}
                title="Step forward"
              >
                ▶
              </button>
              <button type="button" className="toolbar-button" onClick={() => resetSim()} title="Reset simulation">
                ↺
              </button>
            </>
          )}
        </div>

        <span className="toolbar-divider" />

        <div className="toolbar-group">
          <button type="button" className="toolbar-button" onClick={toggleNetlist} title="Toggle read-only netlist view">
            {netlistOpen ? 'Hide Netlist' : 'Netlist'}
          </button>
          <button type="button" className="toolbar-button" onClick={toggleTruthTable} title="Toggle truth table">
            {truthTableOpen ? 'Hide Truth Table' : 'Truth Table'}
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={toggleShowExpressions}
            title="Label wires with the boolean expression they carry (double-click a gate's name to rename it, e.g. an INPUT to x/y/z)"
          >
            {showExpressions ? 'Hide Expressions' : 'Expressions'}
          </button>
        </div>

        <span className="toolbar-divider" />

        <div className="toolbar-group">
          <button type="button" className="toolbar-button" onClick={() => exportToFile(nodes, edges)} title="Export circuit as JSON">
            Export
          </button>
          <button type="button" className="toolbar-button" onClick={handleImportClick} disabled={simActive} title="Import circuit from JSON">
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  )
}
