import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react'
import { toPng } from 'html-to-image'

const PADDING = 32

/**
 * Renders the current diagram (all nodes, regardless of current pan/zoom)
 * to a PNG and downloads it. Follows React Flow's documented screenshot
 * recipe: compute a viewport that fits every node's bounds, then rasterize
 * the `.react-flow__viewport` element at that transform.
 */
export async function exportDiagramAsImage(nodes: Node[]): Promise<void> {
  const viewportEl = document.querySelector<HTMLElement>('.react-flow__viewport')
  if (!viewportEl || nodes.length === 0) return

  const bounds = getNodesBounds(nodes)
  const width = bounds.width + PADDING * 2
  const height = bounds.height + PADDING * 2
  const { x, y, zoom } = getViewportForBounds(bounds, width, height, 0.1, 2, PADDING)

  const dataUrl = await toPng(viewportEl, {
    backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg') || '#ffffff',
    width,
    height,
    style: {
      width: `${width}`,
      height: `${height}`,
      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
    },
  })

  const a = document.createElement('a')
  a.href = dataUrl
  a.download = 'circuit.png'
  a.click()
}
