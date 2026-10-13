import type { Edge } from '@xyflow/react'
import type { CanvasNode, GateNode } from '../model/types'

export interface PortRef {
  gateId: string
  portId: string
}

export interface FlatNetlist {
  /** Base gate nodes only — any collapsed group has been inlined. */
  nodes: GateNode[]
  /** Base wires only, with any edge that touched a group handle rewritten
   * to point at the internal gate/port the group maps that handle to. */
  edges: Edge[]
  /** Looks up what a (possibly nested) group's exposed port maps to, so a
   * collapsed group's live port values can still be displayed. */
  resolveGroupPort: (groupId: string, portId: string) => PortRef | undefined
}

/**
 * Inlines any collapsed `group` nodes into their stored internal gates and
 * wires, rewriting boundary edges to point at the real internal port. The
 * simulation engine only ever sees base gates — groups are a canvas-only,
 * view-layer concept.
 *
 * Supports one level of group nesting (a group cannot currently contain
 * another group), which keeps this rewrite a single pass.
 */
export function flattenCanvas(nodes: CanvasNode[], edges: Edge[]): FlatNetlist {
  const gateNodes: GateNode[] = []
  const flatEdges: Edge[] = []
  const portLookup = new Map<string, PortRef>()

  for (const node of nodes) {
    if (node.type === 'group') {
      gateNodes.push(...node.data.internalNodes)
      flatEdges.push(...node.data.internalEdges)
      for (const mapping of [...node.data.inputs, ...node.data.outputs]) {
        portLookup.set(`${node.id}:${mapping.portId}`, {
          gateId: mapping.internalGateId,
          portId: mapping.internalPortId,
        })
      }
    } else {
      gateNodes.push(node)
    }
  }

  for (const edge of edges) {
    if (!edge.sourceHandle || !edge.targetHandle) continue

    const resolvedSource = portLookup.get(`${edge.source}:${edge.sourceHandle}`)
    const resolvedTarget = portLookup.get(`${edge.target}:${edge.targetHandle}`)

    flatEdges.push({
      ...edge,
      source: resolvedSource?.gateId ?? edge.source,
      sourceHandle: resolvedSource?.portId ?? edge.sourceHandle,
      target: resolvedTarget?.gateId ?? edge.target,
      targetHandle: resolvedTarget?.portId ?? edge.targetHandle,
    })
  }

  return {
    nodes: gateNodes,
    edges: flatEdges,
    resolveGroupPort: (groupId, portId) => portLookup.get(`${groupId}:${portId}`),
  }
}
