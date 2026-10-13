import { useReactFlow } from '@xyflow/react'
import { useRef } from 'react'
import { GATE_SPECS, PALETTE_GATE_TYPES, type GateType } from '../model/gates'
import { useCircuitStore, useTemporalCircuitStore } from '../store/circuitStore'

const COLS = 4
const COL_SPACING = 140
const ROW_SPACING = 90

export default function Toolbar() {
  const addGate = useCircuitStore((s) => s.addGate)
  const { screenToFlowPosition } = useReactFlow()
  // Monotonic — unlike nodes.length, this never goes back down after a
  // delete, so a newly placed gate can't land on top of a surviving one.
  const placedCount = useRef(0)

  const undo = useTemporalCircuitStore((s) => s.undo)
  const redo = useTemporalCircuitStore((s) => s.redo)
  const pastCount = useTemporalCircuitStore((s) => s.pastStates.length)
  const futureCount = useTemporalCircuitStore((s) => s.futureStates.length)

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
            title={`Add ${GATE_SPECS[gateType].label} gate`}
          >
            {GATE_SPECS[gateType].label}
          </button>
        ))}
      </div>
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-button"
          onClick={() => undo()}
          disabled={pastCount === 0}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => redo()}
          disabled={futureCount === 0}
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>
      </div>
    </div>
  )
}
