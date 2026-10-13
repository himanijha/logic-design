import { ReactFlowProvider } from '@xyflow/react'
import FlowCanvas from './components/FlowCanvas'

function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  )
}

export default App
