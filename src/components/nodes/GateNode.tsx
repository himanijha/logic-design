import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { GATE_SPECS } from '../../model/gates'
import type { GateNode as GateNodeT } from '../../model/types'
import GateSymbol from './GateSymbol'

const WIDTH = 72
const PORT_ROW_HEIGHT = 22
const MIN_HEIGHT = 44

function GateNode({ data, selected }: NodeProps<GateNodeT>) {
  const spec = GATE_SPECS[data.gateType]
  const portCount = Math.max(spec.inputs.length, spec.outputs.length, 1)
  const height = Math.max(MIN_HEIGHT, portCount * PORT_ROW_HEIGHT)

  const portValues = data.portValues as Record<string, boolean> | undefined
  const changed = Boolean(data.changed)
  const onToggleInput = data.onToggleInput as (() => void) | undefined
  const onTick = data.onTick as (() => void) | undefined
  const clickable = data.gateType === 'INPUT' && Boolean(onToggleInput)

  return (
    <div
      className={`gate-node${selected ? ' selected' : ''}${changed ? ' changed' : ''}${clickable ? ' clickable' : ''}`}
      style={{ width: WIDTH, height }}
      onClick={clickable ? onToggleInput : undefined}
      role={clickable ? 'button' : undefined}
      title={clickable ? 'Click to toggle' : undefined}
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
          {portValues && <ValueDot value={portValues[port.id]} side="left" />}
        </Handle>
      ))}

      <div className="gate-symbol">
        <GateSymbol gateType={data.gateType} width={WIDTH} height={height} />
      </div>

      <div className="gate-type-label">{data.label ?? spec.label}</div>

      {data.gateType === 'CLOCK' && onTick && (
        <button
          type="button"
          className="clock-tick-button"
          title="Tick clock"
          onClick={(e) => {
            e.stopPropagation()
            onTick()
          }}
        >
          ⏵
        </button>
      )}

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
          {portValues && <ValueDot value={portValues[port.id]} side="right" />}
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

function portY(index: number, total: number, height: number): number {
  const step = height / (total + 1)
  return step * (index + 1)
}

export default memo(GateNode)
