import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import type { GroupNode as GroupNodeT } from '../../model/types'
import { useCircuitStore } from '../../store/circuitStore'

const WIDTH = 130
const PORT_ROW_HEIGHT = 22
const MIN_HEIGHT = 56

function portY(index: number, total: number, height: number): number {
  const step = height / (total + 1)
  return step * (index + 1)
}

function GroupNode({ id, data, selected }: NodeProps<GroupNodeT>) {
  const ungroup = useCircuitStore((s) => s.ungroup)
  const portCount = Math.max(data.inputs.length, data.outputs.length, 1)
  const height = Math.max(MIN_HEIGHT, portCount * PORT_ROW_HEIGHT)
  const values = data.portValues as Record<string, boolean> | undefined

  return (
    <div className={`group-node${selected ? ' selected' : ''}`} style={{ width: WIDTH, height }}>
      {data.inputs.map((port, i) => (
        <Handle
          key={port.portId}
          id={port.portId}
          type="target"
          position={Position.Left}
          style={{ top: portY(i, data.inputs.length, height) }}
          className="port-handle"
        >
          <span className="port-label port-label-left">{port.label}</span>
          {values && <ValueDot value={values[port.portId]} side="left" />}
        </Handle>
      ))}

      <div className="group-body">
        <span className="group-label">{data.label}</span>
        <button
          type="button"
          className="group-expand-button"
          title="Expand group"
          onClick={() => ungroup(id)}
        >
          ⤢
        </button>
      </div>

      {data.outputs.map((port, i) => (
        <Handle
          key={port.portId}
          id={port.portId}
          type="source"
          position={Position.Right}
          style={{ top: portY(i, data.outputs.length, height) }}
          className="port-handle"
        >
          <span className="port-label port-label-right">{port.label}</span>
          {values && <ValueDot value={values[port.portId]} side="right" />}
        </Handle>
      ))}
    </div>
  )
}

function ValueDot({ value, side }: { value: boolean | undefined; side: 'left' | 'right' }) {
  return (
    <span
      className={`port-value-dot ${value ? 'high' : 'low'}`}
      style={side === 'left' ? { left: 12 } : { right: 12 }}
    />
  )
}

export default memo(GroupNode)
