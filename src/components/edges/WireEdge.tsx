import { StepEdge, type EdgeProps } from '@xyflow/react'

/** Right-angle wire, colored by its carried signal while a simulation is
 * active (value injected into `data.value` by FlowCanvas). */
export default function WireEdge(props: EdgeProps) {
  const value = (props.data as { value?: boolean } | undefined)?.value
  const color =
    value === undefined ? undefined : value ? 'var(--signal-high)' : 'var(--signal-low)'

  return (
    <StepEdge
      {...props}
      style={{ ...props.style, strokeWidth: value === undefined ? 2 : 2.5, stroke: color }}
    />
  )
}
