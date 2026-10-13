import { StepEdge, type EdgeProps } from '@xyflow/react'

/** Right-angle wire. Kept as its own component so signal-state styling
 * (driven by the simulation engine) can be layered on later. */
export default function WireEdge(props: EdgeProps) {
  return <StepEdge {...props} style={{ ...props.style, strokeWidth: 2 }} />
}
