import { GATE_SPECS } from '../model/gates'
import { useCircuitStore } from '../store/circuitStore'
import { useUiStore } from '../store/uiStore'

/** Read-only text view of the diagram's current gates and wires. The
 * diagram is the source of truth; this is just a generated view of it. */
export default function NetlistPanel() {
  const open = useUiStore((s) => s.netlistOpen)
  const toggle = useUiStore((s) => s.toggleNetlist)
  const nodes = useCircuitStore((s) => s.nodes)
  const edges = useCircuitStore((s) => s.edges)

  if (!open) return null

  const nameOf = (id: string) => {
    const node = nodes.find((n) => n.id === id)
    if (!node) return id.slice(0, 6)
    const label =
      node.type === 'group' ? node.data.label : node.data.label ?? GATE_SPECS[node.data.gateType].label
    return `${label}#${id.slice(0, 4)}`
  }

  const gateLines = nodes.map((n) =>
    n.type === 'group'
      ? `${nameOf(n.id)}  GROUP (${n.data.internalNodes.length} gates)`
      : `${nameOf(n.id)}  ${n.data.gateType}`,
  )

  const wireLines = edges.map(
    (e) => `${nameOf(e.source)}.${e.sourceHandle} -> ${nameOf(e.target)}.${e.targetHandle}`,
  )

  return (
    <div className="side-panel">
      <button type="button" className="side-panel-close" onClick={toggle} title="Close">
        ×
      </button>
      <h2>Gates ({nodes.length})</h2>
      <pre>{gateLines.join('\n') || '(empty)'}</pre>
      <h2>Wires ({edges.length})</h2>
      <pre>{wireLines.join('\n') || '(empty)'}</pre>
    </div>
  )
}
