import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  SelectionMode,
  type Edge,
  type IsValidConnection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo } from 'react'
import { GATE_SPECS } from '../model/gates'
import type { CanvasNode } from '../model/types'
import { computeExpressions, nodeInputExpr, nodeOutputExpr } from '../sim/expression'
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
import HelpButton from './HelpModal'

const nodeTypes = { gate: GateNode, group: GroupNode }
const edgeTypes = { [WIRE_EDGE_TYPE]: WireEdge }

const GRID: [number, number] = [16, 16]

const isValidConnection: IsValidConnection = (conn) => {
  // Ports render as separate target/source handles, so React Flow already
  // restricts a drag to the opposite handle type. Just guard self-loops.
  return conn.source !== conn.target
}

// With Shift held, React Flow starts a box selection on any pointer-down,
// even one over a gate, and the slightest mouse movement then clears the
// selection and swallows the click. Stopping the event above React Flow
// keeps it a plain Shift-click, which toggles that gate in the selection.
function keepShiftClickOnGate(event: React.PointerEvent) {
  if (!event.shiftKey || !(event.target instanceof Element)) return
  if (event.target.closest('.react-flow__handle')) return
  if (event.target.closest('.react-flow__node')) event.stopPropagation()
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
  const setEditingWireId = useUiStore((s) => s.setEditingWireId)

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

  // Expressions shown on nodes themselves: each collapsed block's output
  // ports, and the full expression arriving at each OUT gate.
  const nodeExprs = useMemo(() => {
    const isOutput = (n: CanvasNode) => n.type === 'gate' && n.data.gateType === 'OUTPUT'
    if (!nodes.some((n) => n.type === 'group' || isOutput(n))) return undefined
    const netlist = flattenCanvas(nodes, edges)
    const exprs = computeExpressions(netlist.nodes, netlist.edges)
    const byNode: Record<string, Record<string, unknown>> = {}
    for (const node of nodes) {
      if (node.type === 'group') {
        byNode[node.id] = {
          outputExprs: Object.fromEntries(
            node.data.outputs.map((port) => [port.portId, nodeOutputExpr(nodes, netlist, exprs, node.id, port.portId)]),
          ),
        }
      } else if (isOutput(node) && edges.some((e) => e.target === node.id)) {
        byNode[node.id] = { expr: nodeInputExpr(nodes, edges, netlist, exprs, node.id, 'a') }
      }
    }
    return byNode
  }, [nodes, edges])

  const displayNodes = useMemo<CanvasNode[]>(() => {
    const withExprs = (node: CanvasNode): CanvasNode => {
      const extra = nodeExprs?.[node.id]
      return extra ? ({ ...node, data: { ...node.data, ...extra } } as CanvasNode) : node
    }

    if (!simActive || !snapshot) return nodeExprs ? nodes.map(withExprs) : nodes

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
        const grouped = withExprs(node)
        return { ...grouped, data: { ...grouped.data, portValues } } as CanvasNode
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
          ...nodeExprs?.[node.id],
          portValues,
          changed: changedSet.has(node.id),
          onToggleInput: node.data.gateType === 'INPUT' ? () => toggleInput(node.id) : undefined,
          onTick: node.data.gateType === 'CLOCK' ? () => tickClock(node.id) : undefined,
        },
      }
    })
  }, [nodes, edges, simActive, snapshot, toggleInput, tickClock, nodeExprs])

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

      const expr = exprs ? nodeOutputExpr(nodes, netlist!, exprs, edge.source, edge.sourceHandle) : undefined

      return { ...edge, data: { ...edge.data, value, expr } }
    })
  }, [edges, nodes, simActive, snapshot, showExpressions])

  return (
    <div className="canvas-wrapper" onPointerDownCapture={keepShiftClickOnGate}>
      <Toolbar />
      <HelpButton />
      <NetlistPanel />
      <TruthTablePanel />
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeDoubleClick={(_, edge) => {
          if (!simActive) setEditingWireId(edge.id)
        }}
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
        selectionMode={SelectionMode.Partial}
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
