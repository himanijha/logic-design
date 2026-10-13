import type { Edge } from '@xyflow/react'
import type { CanvasNode } from './model/types'

const STORAGE_KEY = 'logic-design:circuit'

export interface SavedCircuit {
  version: 1
  nodes: CanvasNode[]
  edges: Edge[]
}

export function saveToLocalStorage(nodes: CanvasNode[], edges: Edge[]): void {
  const doc: SavedCircuit = { version: 1, nodes, edges }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
  } catch {
    // Storage can be unavailable (private mode, quota) — saving is best-effort.
  }
}

export function loadFromLocalStorage(): SavedCircuit | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return parseCircuitDocument(raw)
  } catch {
    return null
  }
}

export function parseCircuitDocument(raw: string): SavedCircuit | null {
  try {
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) return null
    return { version: 1, nodes: data.nodes, edges: data.edges }
  } catch {
    return null
  }
}

export function exportToFile(nodes: CanvasNode[], edges: Edge[]): void {
  const doc: SavedCircuit = { version: 1, nodes, edges }
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'circuit.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function importFromFile(file: File): Promise<SavedCircuit | null> {
  return file.text().then(parseCircuitDocument)
}
