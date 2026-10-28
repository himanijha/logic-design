import type { Edge } from '@xyflow/react'
import type { CanvasNode } from './model/types'
import { parseCircuitDocument, type SavedCircuit } from './persistence'

const HASH_PREFIX = '#d='

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function buildShareUrl(nodes: CanvasNode[], edges: Edge[]): string {
  const doc: SavedCircuit = { version: 1, nodes, edges }
  const encoded = toBase64Url(JSON.stringify(doc))
  const url = new URL(window.location.href)
  url.hash = `${HASH_PREFIX.slice(1)}${encoded}`
  return url.toString()
}

/** Encodes the circuit into the page URL's hash and copies the full link
 * to the clipboard. Returns the URL on success, or null if nothing could
 * be copied (clipboard access denied, etc.) — caller decides how to
 * surface that. */
export async function copyShareLink(nodes: CanvasNode[], edges: Edge[]): Promise<string | null> {
  const url = buildShareUrl(nodes, edges)
  try {
    await navigator.clipboard.writeText(url)
    return url
  } catch {
    return null
  }
}

/** Reads a circuit encoded in the current page URL's hash, if any. Does
 * not touch the hash itself — the caller clears it once loaded, so edits
 * made afterwards don't keep growing the same stale link. */
export function readCircuitFromLocationHash(): SavedCircuit | null {
  const hash = window.location.hash
  if (!hash.startsWith(HASH_PREFIX)) return null
  try {
    const json = fromBase64Url(hash.slice(HASH_PREFIX.length))
    return parseCircuitDocument(json)
  } catch {
    return null
  }
}

export function clearLocationHash(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}
