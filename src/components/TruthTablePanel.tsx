import { EMPTY_SIM_STATE } from '../sim/engine'
import { computeTruthTable } from '../sim/truthTable'
import { useCircuitStore } from '../store/circuitStore'
import { useSimulationStore } from '../store/simulationStore'
import { useUiStore } from '../store/uiStore'

/** Read-only truth table generated from the diagram's current INPUT/OUTPUT
 * gates — one row per input combination, settled through the same engine
 * the live simulation uses. */
export default function TruthTablePanel() {
  const open = useUiStore((s) => s.truthTableOpen)
  const toggle = useUiStore((s) => s.toggleTruthTable)
  const nodes = useCircuitStore((s) => s.nodes)
  const edges = useCircuitStore((s) => s.edges)
  const simActive = useSimulationStore((s) => s.active)
  const baseState = useSimulationStore((s) => (s.active ? s.history[s.index]?.state : undefined))

  if (!open) return null

  const table = computeTruthTable(nodes, edges, baseState ?? EMPTY_SIM_STATE)

  return (
    <div className="side-panel">
      <button type="button" className="side-panel-close" onClick={toggle} title="Close">
        ×
      </button>
      <h2>Truth Table</h2>

      {table.inputLabels.length === 0 && <p>Add an INPUT gate to see a truth table.</p>}
      {table.inputLabels.length > 0 && table.outputLabels.length === 0 && (
        <p>Add an OUTPUT gate to see results.</p>
      )}

      {table.hasSequential && (
        <p className="truth-table-note">
          This circuit has a clock or flip-flop — the table reflects their{' '}
          {simActive ? 'current' : 'initial'} state, not every possible behavior.
        </p>
      )}

      {table.inputLabels.length > 0 && table.outputLabels.length > 0 && (
        <table className="truth-table">
          <thead>
            <tr>
              {table.inputLabels.map((label) => (
                <th key={`in-${label}`}>{label}</th>
              ))}
              {table.outputLabels.map((label) => (
                <th key={`out-${label}`} className="truth-table-output-col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}>
                {row.inputs.map((bit, j) => (
                  <td key={j}>{bit ? 1 : 0}</td>
                ))}
                {row.outputs.map((bit, j) => (
                  <td key={j} className="truth-table-output-col">
                    {bit ? 1 : 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {table.truncated && <p className="truth-table-note">Too many inputs to show every row — truncated.</p>}
    </div>
  )
}
