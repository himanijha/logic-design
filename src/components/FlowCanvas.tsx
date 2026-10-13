import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type IsValidConnection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect } from 'react'
import { useCircuitStore, useTemporalCircuitStore, WIRE_EDGE_TYPE } from '../store/circuitStore'
import GateNode from './nodes/GateNode'
import WireEdge from './edges/WireEdge'
import Toolbar from './Toolbar'

const nodeTypes = { gate: GateNode }
const edgeTypes = { [WIRE_EDGE_TYPE]: WireEdge }

const GRID: [number, number] = [16, 16]

const isValidConnection: IsValidConnection = (conn) => {
  // Ports render as separate target/source handles, so React Flow already
  // restricts a drag to the opposite handle type. Just guard self-loops.
  return conn.source !== conn.target
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

export default function FlowCanvas() {
  const nodes = useCircuitStore((s) => s.nodes)
  const edges = useCircuitStore((s) => s.edges)
  const onNodesChange = useCircuitStore((s) => s.onNodesChange)
  const onEdgesChange = useCircuitStore((s) => s.onEdgesChange)
  const onConnect = useCircuitStore((s) => s.onConnect)
  const duplicateSelected = useCircuitStore((s) => s.duplicateSelected)
  const undo = useTemporalCircuitStore((s) => s.undo)
  const redo = useTemporalCircuitStore((s) => s.redo)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return

      const key = event.key.toLowerCase()
      if (key === 'z' && event.shiftKey) {
        event.preventDefault()
        redo()
      } else if (key === 'z') {
        event.preventDefault()
        undo()
      } else if (key === 'y') {
        event.preventDefault()
        redo()
      } else if (key === 'd' || key === 'v' || key === 'c') {
        event.preventDefault()
        duplicateSelected()
      }
    },
    [undo, redo, duplicateSelected],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="canvas-wrapper">
      <Toolbar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: WIRE_EDGE_TYPE }}
        isValidConnection={isValidConnection}
        snapToGrid
        snapGrid={GRID}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  )
}
