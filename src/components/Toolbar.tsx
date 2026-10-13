import { useReactFlow } from '@xyflow/react'
import { useRef } from 'react'
import { GATE_SPECS, PALETTE_GATE_TYPES, type GateType } from '../model/gates'
import { useCircuitStore, useTemporalCircuitStore } from '../store/circuitStore'
import { useSimulationStore } from '../store/simulationStore'

const COLS = 4
const COL_SPACING = 140
const ROW_SPACING = 90

export default function Toolbar() {
  const addGate = useCircuitStore((s) => s.addGate)
  const groupSelected = useCircuitStore((s) => s.groupSelected)
  const nodes = useCircuitStore((s) => s.nodes)
  const { screenToFlowPosition } = useReactFlow()
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

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {PALETTE_GATE_TYPES.map((gateType) => (
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
    </div>
  )
}
