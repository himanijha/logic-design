import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

/** Right-angle wire, colored by its carried signal while a simulation is
 * active, and optionally labeled with its symbolic boolean expression
 * (both injected into `data` by FlowCanvas). */
export default function WireEdge(props: EdgeProps) {
  const { value, expr } = (props.data as { value?: boolean; expr?: string } | undefined) ?? {}
  const color = value === undefined ? undefined : value ? 'var(--signal-high)' : 'var(--signal-low)'

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 0,
  })

  return (
    <>
      <BaseEdge
        {...props}
        path={path}
        style={{ ...props.style, strokeWidth: value === undefined ? 2 : 2.5, stroke: color }}
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
