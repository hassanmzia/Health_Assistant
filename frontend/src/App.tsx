import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useWebSocket } from './hooks/useWebSocket'
import { useStore } from './store'
import { useAuthStore } from './store/authStore'
import Layout from './components/common/Layout'
import ChatPage from './components/chat/ChatPage'
import DashboardPage from './components/dashboard/DashboardPage'
import HITLPage from './components/hitl/HITLPage'
import AgentMonitoringPage from './components/agents/AgentMonitoringPage'
import ObservabilityDashboard from './components/observability/ObservabilityDashboard'
import FHIRBrowserPage from './components/fhir/FHIRBrowserPage'
import FHIRPatientList from './components/fhir/FHIRPatientList'
import FHIRPatientDetail from './components/fhir/FHIRPatientDetail'
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import ProfilePage from './components/auth/ProfilePage'
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppContent() {
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
    <Routes>
      {/* Guest routes (login/register) */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ChatPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="hitl" element={<HITLPage />} />
        <Route path="agents" element={<AgentMonitoringPage />} />
        <Route path="observability" element={<ObservabilityDashboard />} />
        <Route path="profile" element={<ProfilePage />} />
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
  )
}

function App() {
  const { loadFromStorage } = useAuthStore()

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
