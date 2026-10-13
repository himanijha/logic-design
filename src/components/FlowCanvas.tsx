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
import type { CanvasNode } from '../model/types'
import { computeExpressions, isBareVariableSource, nodeOutputExpr } from '../sim/expression'
import { flattenCanvas } from '../sim/netlist'
import { nodeInputValue, nodeOutputValue } from '../sim/portValue'
import { useCircuitStore, useTemporalCircuitStore, WIRE_EDGE_TYPE } from '../store/circuitStore'
import { useSimulationStore } from '../store/simulationStore'
import { useUiStore } from '../store/uiStore'
import GateNode from './nodes/GateNode'
import GroupNode from './nodes/GroupNode'
import WireEdge from './edges/WireEdge'
import Toolbar from './Toolbar'
import NetlistPanel from './NetlistPanel'
import TruthTablePanel from './TruthTablePanel'

const nodeTypes = { gate: GateNode, group: GroupNode }
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
  const groupSelected = useCircuitStore((s) => s.groupSelected)
  const undo = useTemporalCircuitStore((s) => s.undo)
  const redo = useTemporalCircuitStore((s) => s.redo)

  const simActive = useSimulationStore((s) => s.active)
  const snapshot = useSimulationStore((s) => s.history[s.index])
  const toggleInput = useSimulationStore((s) => s.toggleInput)
  const tickClock = useSimulationStore((s) => s.tickClock)
  const showExpressions = useUiStore((s) => s.showExpressions)

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
      } else if (key === 'g') {
        event.preventDefault()
        groupSelected()
      } else if (key === 'd' || key === 'v' || key === 'c') {
        event.preventDefault()
        duplicateSelected()
      }
    },
    [undo, redo, groupSelected, duplicateSelected],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const displayNodes = useMemo<CanvasNode[]>(() => {
    if (!simActive || !snapshot) return nodes

    const netlist = flattenCanvas(nodes, edges)
    const changedSet = new Set(snapshot.changedGateIds)

    return nodes.map((node) => {
      if (node.type === 'group') {
        const portValues: Record<string, boolean> = {}
        for (const port of node.data.inputs) {
          portValues[port.portId] = nodeInputValue(nodes, edges, netlist, snapshot.outputs, node.id, port.portId)
        }
        for (const port of node.data.outputs) {
          portValues[port.portId] = nodeOutputValue(nodes, netlist, snapshot.outputs, node.id, port.portId)
        }
        return { ...node, data: { ...node.data, portValues } }
      }

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
          changed: changedSet.has(node.id),
          onToggleInput: node.data.gateType === 'INPUT' ? () => toggleInput(node.id) : undefined,
          onTick: node.data.gateType === 'CLOCK' ? () => tickClock(node.id) : undefined,
        },
      }
    })
  }, [nodes, edges, simActive, snapshot, toggleInput, tickClock])

  const displayEdges = useMemo<Edge[]>(() => {
    if (!simActive && !showExpressions) return edges

    const netlist = simActive || showExpressions ? flattenCanvas(nodes, edges) : undefined
    const exprs = showExpressions ? computeExpressions(netlist!.nodes, netlist!.edges) : undefined

    return edges.map((edge) => {
      if (!edge.sourceHandle) return edge
      const value =
        simActive && snapshot
          ? nodeOutputValue(nodes, netlist!, snapshot.outputs, edge.source, edge.sourceHandle)
          : undefined

      const sourceNode = nodes.find((n) => n.id === edge.source)
      const expr =
        exprs && !isBareVariableSource(sourceNode)
          ? nodeOutputExpr(nodes, netlist!, exprs, edge.source, edge.sourceHandle)
          : undefined

      return { ...edge, data: { ...edge.data, value, expr } }
    })
  }, [edges, nodes, simActive, snapshot, showExpressions])

  return (
    <div className="canvas-wrapper">
      <Toolbar />
      <NetlistPanel />
      <TruthTablePanel />
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
