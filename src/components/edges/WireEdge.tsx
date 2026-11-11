import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { useState } from 'react'
import { useCircuitStore } from '../../store/circuitStore'
import { useSimulationStore } from '../../store/simulationStore'
import { useUiStore } from '../../store/uiStore'

/** Right-angle wire, colored by its carried signal while a simulation is
 * active, and labeled with the user's own name for it and/or its symbolic
 * boolean expression (value/expr are injected into `data` by FlowCanvas). */
export default function WireEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  style,
  markerStart,
  markerEnd,
  interactionWidth,
  data,
}: EdgeProps) {
  const { value, expr, label } =
    (data as { value?: boolean; expr?: string; label?: string } | undefined) ?? {}
  const color = value === undefined ? undefined : value ? 'var(--signal-high)' : 'var(--signal-low)'

  const renameWire = useCircuitStore((s) => s.renameWire)
  const simActive = useSimulationStore((s) => s.active)
  const editing = useUiStore((s) => s.editingWireId === id)
  const setEditingWireId = useUiStore((s) => s.setEditingWireId)
  const [draft, setDraft] = useState<string | null>(null)

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  })

  const text = label && expr ? `${label} = ${expr}` : (label ?? expr)
  const position = { transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }

  function commit() {
    if (draft !== null) renameWire(id, draft)
    setDraft(null)
    setEditingWireId(null)
  }

  function cancel() {
    setDraft(null)
    setEditingWireId(null)
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ ...style, strokeWidth: value === undefined ? 2 : 2.5, stroke: color }}
        markerStart={markerStart}
        markerEnd={markerEnd}
        interactionWidth={interactionWidth}
      />
      {editing ? (
        <EdgeLabelRenderer>
          <input
            autoFocus
            className="wire-label-input nodrag nopan"
            style={position}
            placeholder="Wire name"
            value={draft ?? label ?? ''}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') commit()
              else if (e.key === 'Escape') cancel()
            }}
          />
        </EdgeLabelRenderer>
      ) : (
        text && (
          <EdgeLabelRenderer>
            <div
              className={`wire-expr-label${label ? ' wire-custom-label nodrag nopan' : ''}`}
              style={position}
              title={label && !simActive ? 'Double-click to rename' : undefined}
              onDoubleClick={
                label && !simActive
                  ? (e) => {
                      e.stopPropagation()
                      setEditingWireId(id)
                    }
                  : undefined
              }
            >
              {text}
            </div>
          </EdgeLabelRenderer>
        )
      )}
    </>
  )
}
