import { ReactFlowProvider } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import FlowCanvas from './components/FlowCanvas'
import { loadFromLocalStorage, saveToLocalStorage } from './persistence'
import { useCircuitStore } from './store/circuitStore'

function App() {
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
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
