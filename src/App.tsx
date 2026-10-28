import { ReactFlowProvider } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import FlowCanvas from './components/FlowCanvas'
import { loadFromLocalStorage, saveToLocalStorage } from './persistence'
import { clearLocationHash, readCircuitFromLocationHash } from './shareLink'
import { useCircuitStore } from './store/circuitStore'

function App() {
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    // A share link in the URL hash wins over whatever's already saved
    // locally — that's the whole point of opening one. Load it once, then
    // drop the hash so it doesn't keep re-importing itself on refresh
    // after the user's made their own edits.
    const shared = readCircuitFromLocationHash()
    if (shared) {
      useCircuitStore.getState().loadCircuit(shared)
      clearLocationHash()
      return
    }

    const saved = loadFromLocalStorage()
    if (saved) {
      useCircuitStore.getState().loadCircuit(saved)
    }
  }, [])

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = useCircuitStore.subscribe((state, prevState) => {
      if (state.nodes === prevState.nodes && state.edges === prevState.edges) return
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => saveToLocalStorage(state.nodes, state.edges), 400)
    })
    return () => {
      if (timeout) clearTimeout(timeout)
      unsubscribe()
    }
  }, [])

  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  )
}

export default App
