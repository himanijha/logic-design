import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import { nanoid } from 'nanoid'
import { temporal, type TemporalState, type ZundoOptions } from 'zundo'
import { useStore } from 'zustand'
import { createWithEqualityFn } from 'zustand/traditional'
import { shallow } from 'zustand/shallow'
import { GATE_SPECS, type GateType } from '../model/gates'
import type { GateNodeData } from '../model/types'

export type GateNode = Node<GateNodeData, 'gate'>

export const WIRE_EDGE_TYPE = 'wire'

interface CircuitState {
  nodes: GateNode[]
  edges: Edge[]
  onNodesChange: (changes: NodeChange<GateNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addGate: (gateType: GateType, position: { x: number; y: number }) => void
  removeSelected: () => void
  duplicateSelected: () => void
  setNodes: (nodes: GateNode[]) => void
  setEdges: (edges: Edge[]) => void
}

function makeGateNode(gateType: GateType, position: { x: number; y: number }): GateNode {
  return {
    id: nanoid(8),
    type: 'gate',
    position,
    data: { gateType },
  }
}

type CircuitSnapshot = Pick<CircuitState, 'nodes' | 'edges'>

const temporalOptions: ZundoOptions<CircuitState, CircuitSnapshot> = {
  limit: 100,
  equality: shallow,
  partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
}

export const useCircuitStore = createWithEqualityFn<CircuitState>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],

      onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) })
      },

      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) })
      },

      onConnect: (connection) => {
        if (!connection.source || !connection.target) return
        if (connection.source === connection.target) return
        if (!connection.sourceHandle || !connection.targetHandle) return

        // Each input port accepts exactly one driving wire: replace any
        // existing wire already feeding this target handle.
        const edges = get().edges.filter(
          (e) =>
            !(e.target === connection.target && e.targetHandle === connection.targetHandle),
        )

        const newEdge: Edge = {
          id: nanoid(8),
          type: WIRE_EDGE_TYPE,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        }

        set({ edges: [...edges, newEdge] })
      },

      addGate: (gateType, position) => {
        set({ nodes: [...get().nodes, makeGateNode(gateType, position)] })
      },

      removeSelected: () => {
        const selectedNodeIds = new Set(
          get().nodes.filter((n) => n.selected).map((n) => n.id),
        )
        const edges = get().edges.filter(
          (e) =>
            !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target),
        )
        const nodes = get().nodes.filter((n) => !n.selected)
        set({ nodes, edges })
      },

      duplicateSelected: () => {
        const selectedNodes = get().nodes.filter((n) => n.selected)
        if (selectedNodes.length === 0) return

        const idMap = new Map<string, string>()
        const offset = { x: 40, y: 40 }

        const clones: GateNode[] = selectedNodes.map((n) => {
          const newId = nanoid(8)
          idMap.set(n.id, newId)
          return {
            ...n,
            id: newId,
            selected: true,
            position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
            data: { ...n.data },
          }
        })

        const selectedEdges = get().edges.filter(
          (e) => idMap.has(e.source) && idMap.has(e.target),
        )
        const clonedEdges: Edge[] = selectedEdges.map((e) => ({
          ...e,
          id: nanoid(8),
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!,
          selected: true,
        }))

        set({
          nodes: [
            ...get().nodes.map((n) => ({ ...n, selected: false })),
            ...clones,
          ],
          edges: [...get().edges.map((e) => ({ ...e, selected: false })), ...clonedEdges],
        })
      },

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
    }),
    temporalOptions,
  ),
  shallow,
)

type CircuitTemporalState = TemporalState<CircuitSnapshot>

export function useTemporalCircuitStore<T>(selector: (state: CircuitTemporalState) => T): T {
  return useStore(useCircuitStore.temporal, selector)
}

export { GATE_SPECS }
