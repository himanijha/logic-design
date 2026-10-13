import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

/** Right-angle wire, colored by its carried signal while a simulation is
 * active, and optionally labeled with its symbolic boolean expression
 * (both injected into `data` by FlowCanvas). */
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
  const { value, expr } = (data as { value?: boolean; expr?: string } | undefined) ?? {}
  const color = value === undefined ? undefined : value ? 'var(--signal-high)' : 'var(--signal-low)'

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  })

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
      {expr && (
        <EdgeLabelRenderer>
          <div
            className="wire-expr-label"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {expr}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
