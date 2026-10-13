import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { GATE_SPECS } from '../../model/gates'
import type { GateNode as GateNodeT } from '../../store/circuitStore'
import GateSymbol from './GateSymbol'

const WIDTH = 72
const PORT_ROW_HEIGHT = 22
const MIN_HEIGHT = 44

function GateNode({ data, selected }: NodeProps<GateNodeT>) {
  const spec = GATE_SPECS[data.gateType]
  const portCount = Math.max(spec.inputs.length, spec.outputs.length, 1)
  const height = Math.max(MIN_HEIGHT, portCount * PORT_ROW_HEIGHT)

  return (
    <div
      className={`gate-node${selected ? ' selected' : ''}`}
      style={{ width: WIDTH, height }}
    >
      {spec.inputs.map((port, i) => (
        <Handle
          key={port.id}
          id={port.id}
          type="target"
          position={Position.Left}
          style={{ top: portY(i, spec.inputs.length, height) }}
          className="port-handle"
        >
          <span className="port-label port-label-left">{port.label}</span>
        </Handle>
      ))}

      <div className="gate-symbol">
        <GateSymbol gateType={data.gateType} width={WIDTH} height={height} />
      </div>

      <div className="gate-type-label">{data.label ?? spec.label}</div>

      {spec.outputs.map((port, i) => (
        <Handle
          key={port.id}
          id={port.id}
          type="source"
          position={Position.Right}
          style={{ top: portY(i, spec.outputs.length, height) }}
          className="port-handle"
        >
          <span className="port-label port-label-right">{port.label}</span>
        </Handle>
      ))}
    </div>
  )
}

function portY(index: number, total: number, height: number): number {
  const step = height / (total + 1)
  return step * (index + 1)
}

export default memo(GateNode)
