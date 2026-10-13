import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import { nanoid } from 'nanoid'
import { temporal, type TemporalState, type ZundoOptions } from 'zundo'
import { useStore } from 'zustand'
import { createWithEqualityFn } from 'zustand/traditional'
import { shallow } from 'zustand/shallow'
import { GATE_SPECS, type GateType } from '../model/gates'
import type { CanvasNode, GateNode, GroupNode, GroupPortMapping } from '../model/types'

export const WIRE_EDGE_TYPE = 'wire'

interface CircuitState {
  nodes: CanvasNode[]
  edges: Edge[]
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addGate: (gateType: GateType, position: { x: number; y: number }) => void
  removeSelected: () => void
  duplicateSelected: () => void
  groupSelected: () => void
  ungroup: (groupId: string) => void
  setNodes: (nodes: CanvasNode[]) => void
  setEdges: (edges: Edge[]) => void
  loadCircuit: (circuit: { nodes: CanvasNode[]; edges: Edge[] }) => void
}

function makeGateNode(gateType: GateType, position: { x: number; y: number }): GateNode {
  return {
    id: nanoid(8),
    type: 'gate',
    position,
    data: { gateType },
  }
}

function portLabel(node: GateNode, portId: string): string {
  const spec = GATE_SPECS[node.data.gateType]
  const port = [...spec.inputs, ...spec.outputs].find((p) => p.id === portId)
  return port?.label ?? portId
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

        const clones: CanvasNode[] = selectedNodes.map((n) => {
          const newId = nanoid(8)
          idMap.set(n.id, newId)
          return {
            ...n,
            id: newId,
            selected: true,
            position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
            data: { ...n.data },
          } as CanvasNode
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

      groupSelected: () => {
        const { nodes, edges } = get()
        const selected = nodes.filter((n) => n.selected && n.type === 'gate') as GateNode[]
        if (selected.length < 2) return

        const selectedIds = new Set(selected.map((n) => n.id))
        const internalEdges = edges.filter(
          (e) => selectedIds.has(e.source) && selectedIds.has(e.target),
        )
        const incoming = edges.filter(
          (e) => !selectedIds.has(e.source) && selectedIds.has(e.target),
        )
        const outgoing = edges.filter(
          (e) => selectedIds.has(e.source) && !selectedIds.has(e.target),
        )

        const minX = Math.min(...selected.map((n) => n.position.x))
        const minY = Math.min(...selected.map((n) => n.position.y))

        const internalNodes: GateNode[] = selected.map((n) => ({
          ...n,
          selected: false,
          position: { x: n.position.x - minX, y: n.position.y - minY },
        }))

        const inputs: GroupPortMapping[] = incoming.map((e, i) => {
          const targetNode = selected.find((n) => n.id === e.target)!
          return {
            portId: `in${i}`,
            label: portLabel(targetNode, e.targetHandle ?? ''),
            internalGateId: e.target,
            internalPortId: e.targetHandle ?? '',
          }
        })
        const outputs: GroupPortMapping[] = outgoing.map((e, i) => {
          const sourceNode = selected.find((n) => n.id === e.source)!
          return {
            portId: `out${i}`,
            label: portLabel(sourceNode, e.sourceHandle ?? ''),
            internalGateId: e.source,
            internalPortId: e.sourceHandle ?? '',
          }
        })

        const groupId = nanoid(8)
        const groupNode: GroupNode = {
          id: groupId,
          type: 'group',
          position: { x: minX, y: minY },
          selected: true,
          data: { label: 'Group', internalNodes, internalEdges, inputs, outputs },
        }

        const rewrittenIncoming: Edge[] = incoming.map((e, i) => ({
          ...e,
          target: groupId,
          targetHandle: inputs[i].portId,
        }))
        const rewrittenOutgoing: Edge[] = outgoing.map((e, i) => ({
          ...e,
          source: groupId,
          sourceHandle: outputs[i].portId,
        }))

        const remainingEdgeIds = new Set([...internalEdges, ...incoming, ...outgoing].map((e) => e.id))

        set({
          nodes: [...nodes.filter((n) => !selectedIds.has(n.id)), groupNode],
          edges: [
            ...edges.filter((e) => !remainingEdgeIds.has(e.id)),
            ...rewrittenIncoming,
            ...rewrittenOutgoing,
          ],
        })
      },

      ungroup: (groupId) => {
        const { nodes, edges } = get()
        const group = nodes.find((n) => n.id === groupId && n.type === 'group') as
          | GroupNode
          | undefined
        if (!group) return

        const absoluteInternalNodes: GateNode[] = group.data.internalNodes.map((n) => ({
          ...n,
          position: { x: n.position.x + group.position.x, y: n.position.y + group.position.y },
        }))

        const rewritten: Edge[] = edges
          .filter((e) => e.source === groupId || e.target === groupId)
          .map((e) => {
            if (e.target === groupId) {
              const mapping = group.data.inputs.find((m) => m.portId === e.targetHandle)
              if (!mapping) return e
              return { ...e, target: mapping.internalGateId, targetHandle: mapping.internalPortId }
            }
            const mapping = group.data.outputs.find((m) => m.portId === e.sourceHandle)
            if (!mapping) return e
            return { ...e, source: mapping.internalGateId, sourceHandle: mapping.internalPortId }
          })

        set({
          nodes: [...nodes.filter((n) => n.id !== groupId), ...absoluteInternalNodes],
          edges: [
            ...edges.filter((e) => e.source !== groupId && e.target !== groupId),
            ...rewritten,
            ...group.data.internalEdges,
          ],
        })
      },

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      loadCircuit: (circuit) => set({ nodes: circuit.nodes, edges: circuit.edges }),
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
