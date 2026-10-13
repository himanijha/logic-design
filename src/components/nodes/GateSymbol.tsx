import type { GateType } from '../../model/gates'

interface GateSymbolProps {
  gateType: GateType
  width: number
  height: number
}

const BUBBLE_R = 4

function Bubble({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r={BUBBLE_R} className="gate-outline" fill="var(--node-fill)" />
}

/** Classic logic-gate glyphs, drawn to fit a w×h viewBox with the input
 * edge at x=0 and the output tip around x=w. */
export default function GateSymbol({ gateType, width: w, height: h }: GateSymbolProps) {
  const midY = h / 2
  const bodyRight = w - (hasBubble(gateType) ? BUBBLE_R * 2 : 0)

  switch (gateType) {
    case 'AND':
    case 'NAND': {
      const straightW = bodyRight * 0.55
      const d = `M0,2 L${straightW},2 A${bodyRight - straightW},${midY - 2} 0 0 1 ${straightW},${h - 2} L0,${h - 2} Z`
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <path d={d} className="gate-outline" fill="var(--node-fill)" />
          {hasBubble(gateType) && <Bubble cx={bodyRight + BUBBLE_R} cy={midY} />}
        </svg>
      )
    }
    case 'OR':
    case 'NOR':
    case 'XOR':
    case 'XNOR': {
      const curveOffset = gateType === 'XOR' || gateType === 'XNOR' ? 7 : 0
      const d = `M${curveOffset + 2},2
        Q${bodyRight * 0.45},2 ${bodyRight - 4},${midY}
        Q${bodyRight * 0.45},${h - 2} ${curveOffset + 2},${h - 2}
        Q${bodyRight * 0.22},${midY} ${curveOffset + 2},2 Z`
      const extraCurve = `M${2},2 Q${bodyRight * 0.22},${midY} 2,${h - 2}`
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          {curveOffset > 0 && (
            <path d={extraCurve} className="gate-outline" fill="none" />
          )}
          <path d={d} className="gate-outline" fill="var(--node-fill)" />
          {hasBubble(gateType) && <Bubble cx={bodyRight} cy={midY} />}
        </svg>
      )
    }
    case 'NOT': {
      const d = `M4,2 L${bodyRight - 2},${midY} L4,${h - 2} Z`
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <path d={d} className="gate-outline" fill="var(--node-fill)" />
          <Bubble cx={bodyRight + BUBBLE_R - 2} cy={midY} />
        </svg>
      )
    }
    case 'INPUT': {
      // Flat terminal edge on the left (nothing feeds it), pointed tip on
      // the right where its one output wire leaves.
      const d = `M4,2 L${bodyRight - 10},2 L${bodyRight - 2},${midY} L${bodyRight - 10},${h - 2} L4,${h - 2} Z`
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <path d={d} className="gate-outline io-input" />
        </svg>
      )
    }
    case 'OUTPUT': {
      // Mirror of INPUT: pointed tip on the left where its one input wire
      // arrives, flat terminal edge on the right.
      const d = `M4,${midY} L12,2 L${bodyRight - 2},2 L${bodyRight - 2},${h - 2} L12,${h - 2} Z`
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <path d={d} className="gate-outline io-output" />
        </svg>
      )
    }
    case 'CLOCK': {
      // A pulse-train glyph inside a rounded box, the usual clock-source icon.
      const pulse = `M4,${midY + 8} h6 v-14 h8 v14 h8 v-14 h6`
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <rect x={2} y={2} width={w - 4} height={h - 4} rx={6} className="gate-outline" fill="var(--node-fill)" />
          <path d={pulse} className="gate-outline" fill="none" />
        </svg>
      )
    }
    case 'DFF': {
      // Register box with D/Q pin labels and a clock triangle at the CLK pin.
      const clkY = h - 10
      const triangle = `M4,${clkY - 4} L10,${clkY} L4,${clkY + 4} Z`
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <rect x={2} y={2} width={w - 4} height={h - 4} rx={3} className="gate-outline" fill="var(--node-fill)" />
          <text x={8} y={16} className="gate-pin-text">D</text>
          <text x={w - 16} y={16} className="gate-pin-text">Q</text>
          <path d={triangle} className="gate-outline" fill="none" />
        </svg>
      )
    }
    default: {
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <rect
            x={2}
            y={2}
            width={w - 4}
            height={h - 4}
            rx={6}
            className="gate-outline"
            fill="var(--node-fill)"
          />
        </svg>
      )
    }
  }
}

function hasBubble(gateType: GateType) {
  return gateType === 'NAND' || gateType === 'NOR' || gateType === 'XNOR'
}
