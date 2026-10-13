import type { ReactNode } from 'react'
import { useUiStore } from '../store/uiStore'

export default function HelpButton() {
  const open = useUiStore((s) => s.helpOpen)
  const toggle = useUiStore((s) => s.toggleHelp)

  return (
    <>
      <button type="button" className="help-gear-button" onClick={toggle} title="How this works">
        ⚙
      </button>
      {open && (
        <div className="help-overlay" onClick={toggle}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="side-panel-close" onClick={toggle} title="Close">
              ×
            </button>
            <h2>How this works</h2>

            <Section title="Building a circuit">
              <ul>
                <li>Click a gate in the top-left palette to drop it on the canvas.</li>
                <li>Drag from one gate's port to another's to wire them together.</li>
                <li>Click a gate or wire to select it; shift-click or drag a box to select several.</li>
                <li>
                  <b>Backspace</b>/<b>Delete</b> removes the selection, <b>Ctrl/Cmd+D</b> duplicates it,{' '}
                  <b>Ctrl/Cmd+Z</b> undoes, <b>Ctrl/Cmd+Shift+Z</b> redoes.
                </li>
                <li>Double-click a gate's name (the small text under it) to rename it — useful for giving an INPUT a variable name like x, y, z.</li>
              </ul>
            </Section>

            <Section title="Grouping / collapsing">
              <ul>
                <li>Select two or more gates, then click <b>Group</b> (or <b>Ctrl/Cmd+G</b>).</li>
                <li>They collapse into one block; wires crossing the selection boundary become its ports.</li>
                <li>Click the <b>⤢</b> button on a collapsed block to expand it back.</li>
              </ul>
            </Section>

            <Section title="Running the circuit">
              <ul>
                <li>Click <b>▶ Simulate</b> to switch into run mode (editing locks while you're in it).</li>
                <li>Click an INPUT gate to flip it between 0 and 1; click the <b>⏵</b> on a CLOCK gate to pulse it.</li>
                <li>Wires turn green (1) or gray (0); the gate that just changed gets a highlighted ring.</li>
                <li>Use <b>◀</b>/<b>▶</b> to step back and forward through your toggles, or <b>↺</b> to reset.</li>
                <li>Click <b>■ Stop</b> to go back to editing.</li>
              </ul>
            </Section>

            <Section title="Views">
              <ul>
                <li><b>Expressions</b> labels every wire with the boolean expression it carries (e.g. <code>x'</code>, <code>(x·y)</code>) — works whether or not you're simulating.</li>
                <li><b>Netlist</b> shows a read-only text list of every gate and wire in the diagram.</li>
                <li><b>Truth Table</b> enumerates every combination of your INPUT gates and the resulting OUTPUT values.</li>
              </ul>
            </Section>

            <Section title="Saving">
              <ul>
                <li>Your circuit auto-saves to this browser as you work.</li>
                <li><b>Export</b> downloads it as a JSON file; <b>Import</b> loads one back in.</li>
              </ul>
            </Section>
          </div>
        </div>
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="help-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}
