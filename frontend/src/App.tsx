import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useWebSocket } from './hooks/useWebSocket'
import { useStore } from './store'
import Layout from './components/common/Layout'
import ChatPage from './components/chat/ChatPage'
import DashboardPage from './components/dashboard/DashboardPage'
import HITLPage from './components/hitl/HITLPage'
import AgentMonitoringPage from './components/agents/AgentMonitoringPage'
import ObservabilityDashboard from './components/observability/ObservabilityDashboard'

function App() {
  const { connect, disconnect } = useWebSocket()
  const sessionId = useStore((state) => state.sessionId)

  useEffect(() => {
    if (sessionId) {
      connect(sessionId)
    }
    return () => {
      disconnect()
    }
  }, [sessionId, connect, disconnect])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ChatPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="hitl" element={<HITLPage />} />
          <Route path="agents" element={<AgentMonitoringPage />} />
          <Route path="observability" element={<ObservabilityDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
