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
  copySelected: () => boolean
  pasteClipboard: (at?: { x: number; y: number }) => boolean
  groupSelected: () => void
  ungroup: (groupId: string) => void
  renameGate: (nodeId: string, label: string) => void
  renameWire: (edgeId: string, label: string) => void
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

const INPUT_NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function nextInputName(nodes: CanvasNode[]): string {
  const gates = nodes.flatMap((n) => (n.type === 'group' ? n.data.internalNodes : [n]))
  const used = new Set(gates.filter((g) => g.data.gateType === 'INPUT').map((g) => g.data.label))
  const free = INPUT_NAMES.find((name) => !used.has(name))
  if (free) return free
  let i = 1
  while (used.has(`IN${i}`)) i++
  return `IN${i}`
}

const PASTE_OFFSET = 40

/** Copies nodes plus the wires running between them, giving everything
 * fresh ids — including a collapsed block's internal gates and wires, which
 * would otherwise collide with the original's once the canvas is flattened
 * for simulation. Clones come back selected and shifted by `offset`. */
function cloneSubgraph(nodes: CanvasNode[], edges: Edge[], offset: { x: number; y: number }) {
  const idMap = new Map(nodes.map((n) => [n.id, nanoid(8)]))

  const clones = nodes.map((n): CanvasNode => {
    const position = { x: n.position.x + offset.x, y: n.position.y + offset.y }
    if (n.type !== 'group') return { ...n, id: idMap.get(n.id)!, selected: true, position, data: { ...n.data } }

    const innerIds = new Map(n.data.internalNodes.map((g) => [g.id, nanoid(8)]))
    const remap = (m: GroupPortMapping) => ({ ...m, internalGateId: innerIds.get(m.internalGateId)! })
    return {
      ...n,
      id: idMap.get(n.id)!,
      selected: true,
      position,
      data: {
        ...n.data,
        internalNodes: n.data.internalNodes.map((g) => ({ ...g, id: innerIds.get(g.id)!, data: { ...g.data } })),
        internalEdges: n.data.internalEdges.map((e) => ({
          ...e,
          id: nanoid(8),
          source: innerIds.get(e.source)!,
          target: innerIds.get(e.target)!,
        })),
        inputs: n.data.inputs.map(remap),
        outputs: n.data.outputs.map(remap),
      },
    }
  })

  const clonedEdges: Edge[] = edges
    .filter((e) => idMap.has(e.source) && idMap.has(e.target))
    .map((e) => ({ ...e, id: nanoid(8), source: idMap.get(e.source)!, target: idMap.get(e.target)!, selected: true }))

  return { nodes: clones, edges: clonedEdges }
}

// Lives outside the store so copying never creates an undo step.
let clipboard: { nodes: CanvasNode[]; edges: Edge[]; pastes: number } | null = null

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
        const node = makeGateNode(gateType, position)
        if (gateType === 'INPUT') node.data.label = nextInputName(get().nodes)
        set({ nodes: [...get().nodes, node] })
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
        const copy = cloneSubgraph(selectedNodes, get().edges, { x: PASTE_OFFSET, y: PASTE_OFFSET })
        set({
          nodes: [...get().nodes.map((n) => ({ ...n, selected: false })), ...copy.nodes],
          edges: [...get().edges.map((e) => ({ ...e, selected: false })), ...copy.edges],
        })
      },

      copySelected: () => {
        const selectedNodes = get().nodes.filter((n) => n.selected)
        if (selectedNodes.length === 0) return false
        const ids = new Set(selectedNodes.map((n) => n.id))
        clipboard = {
          nodes: structuredClone(selectedNodes),
          edges: structuredClone(get().edges.filter((e) => ids.has(e.source) && ids.has(e.target))),
          pastes: 0,
        }
        return true
      },

      pasteClipboard: (at) => {
        if (!clipboard) return false
        clipboard.pastes += 1
        // Land the copy's top-left at the cursor if we know it, else step it
        // down-right from the original a little further on each paste.
        const left = Math.min(...clipboard.nodes.map((n) => n.position.x))
        const top = Math.min(...clipboard.nodes.map((n) => n.position.y))
        const step = PASTE_OFFSET * clipboard.pastes
        const offset = at ? { x: at.x - left, y: at.y - top } : { x: step, y: step }
        const copy = cloneSubgraph(clipboard.nodes, clipboard.edges, offset)
        set({
          nodes: [...get().nodes.map((n) => ({ ...n, selected: false })), ...copy.nodes],
          edges: [...get().edges.map((e) => ({ ...e, selected: false })), ...copy.edges],
        })
        return true
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

      renameGate: (nodeId, label) => {
        const trimmed = label.trim()
        set({
          nodes: get().nodes.map((n) => {
            if (n.id !== nodeId) return n
            if (n.type === 'group') return { ...n, data: { ...n.data, label: trimmed || n.data.label } }
            return { ...n, data: { ...n.data, label: trimmed || undefined } }
          }),
        })
      },

      renameWire: (edgeId, label) => {
        const trimmed = label.trim()
        set({
          edges: get().edges.map((e) =>
            e.id === edgeId ? { ...e, data: { ...e.data, label: trimmed || undefined } } : e,
          ),
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
