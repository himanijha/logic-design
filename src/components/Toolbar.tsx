import { useReactFlow } from '@xyflow/react'
import { GATE_SPECS, PALETTE_GATE_TYPES, type GateType } from '../model/gates'
import { useCircuitStore, useTemporalCircuitStore } from '../store/circuitStore'

export default function Toolbar() {
  const addGate = useCircuitStore((s) => s.addGate)
  const gateCount = useCircuitStore((s) => s.nodes.length)
  const { screenToFlowPosition } = useReactFlow()

  const undo = useTemporalCircuitStore((s) => s.undo)
  const redo = useTemporalCircuitStore((s) => s.redo)
  const pastCount = useTemporalCircuitStore((s) => s.pastStates.length)
  const futureCount = useTemporalCircuitStore((s) => s.futureStates.length)

  function handleAddGate(gateType: GateType) {
    const stagger = (gateCount % 6) * 24
    const position = screenToFlowPosition({ x: 240 + stagger, y: 160 + stagger })
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
