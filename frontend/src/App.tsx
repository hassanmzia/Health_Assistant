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
import FHIRBrowserPage from './components/fhir/FHIRBrowserPage'
import FHIRPatientList from './components/fhir/FHIRPatientList'
import FHIRPatientDetail from './components/fhir/FHIRPatientDetail'
import {
  PractitionerListPage,
  OrganizationListPage,
  EncounterListPage,
  ConditionListPage,
  ObservationListPage,
  MedicationListPage,
  AllergyListPage,
  ProcedureListPage,
  ImmunizationListPage,
} from './components/fhir/FHIRResourcePages'

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
          <Route path="fhir" element={<FHIRBrowserPage />} />
          <Route path="fhir/patients" element={<FHIRPatientList />} />
          <Route path="fhir/patients/:id" element={<FHIRPatientDetail />} />
          <Route path="fhir/practitioners" element={<PractitionerListPage />} />
          <Route path="fhir/organizations" element={<OrganizationListPage />} />
          <Route path="fhir/encounters" element={<EncounterListPage />} />
          <Route path="fhir/conditions" element={<ConditionListPage />} />
          <Route path="fhir/observations" element={<ObservationListPage />} />
          <Route path="fhir/medications" element={<MedicationListPage />} />
          <Route path="fhir/allergies" element={<AllergyListPage />} />
          <Route path="fhir/procedures" element={<ProcedureListPage />} />
          <Route path="fhir/immunizations" element={<ImmunizationListPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
