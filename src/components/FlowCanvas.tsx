import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type IsValidConnection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo } from 'react'
import { GATE_SPECS } from '../model/gates'
import { flattenCanvas } from '../sim/netlist'
import { nodeInputValue, nodeOutputValue } from '../sim/portValue'
import {
  useCircuitStore,
  useTemporalCircuitStore,
  WIRE_EDGE_TYPE,
  type GateNode as GateNodeT,
} from '../store/circuitStore'
import { useSimulationStore } from '../store/simulationStore'
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

  const simActive = useSimulationStore((s) => s.active)
  const snapshot = useSimulationStore((s) => s.history[s.index])
  const toggleInput = useSimulationStore((s) => s.toggleInput)
  const tickClock = useSimulationStore((s) => s.tickClock)

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

  const displayNodes = useMemo<GateNodeT[]>(() => {
    if (!simActive || !snapshot) return nodes

    const netlist = flattenCanvas(nodes, edges)

    return nodes.map((node) => {
      const spec = GATE_SPECS[node.data.gateType]
      const portValues: Record<string, boolean> = {}
      for (const port of spec.inputs) {
        portValues[port.id] = nodeInputValue(nodes, edges, netlist, snapshot.outputs, node.id, port.id)
      }
      for (const port of spec.outputs) {
        portValues[port.id] = nodeOutputValue(nodes, netlist, snapshot.outputs, node.id, port.id)
      }

      return {
        ...node,
        data: {
          ...node.data,
          portValues,
          changed: snapshot.changedGateIds.includes(node.id),
          onToggleInput: node.data.gateType === 'INPUT' ? () => toggleInput(node.id) : undefined,
          onTick: node.data.gateType === 'CLOCK' ? () => tickClock(node.id) : undefined,
        },
      }
    })
  }, [nodes, edges, simActive, snapshot, toggleInput, tickClock])

  const displayEdges = useMemo<Edge[]>(() => {
    if (!simActive || !snapshot) return edges
    const netlist = flattenCanvas(nodes, edges)
    return edges.map((edge) => {
      if (!edge.sourceHandle) return edge
      const value = nodeOutputValue(nodes, netlist, snapshot.outputs, edge.source, edge.sourceHandle)
      return { ...edge, data: { ...edge.data, value } }
    })
  }, [edges, nodes, simActive, snapshot])

  return (
    <div className="canvas-wrapper">
      <Toolbar />
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: WIRE_EDGE_TYPE }}
        isValidConnection={isValidConnection}
        nodesConnectable={!simActive}
        elementsSelectable={!simActive}
        deleteKeyCode={simActive ? [] : ['Backspace', 'Delete']}
        snapToGrid
        snapGrid={GRID}
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
