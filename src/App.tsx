import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { LoadingScreen } from './components/UI'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Ships = lazy(() => import('./pages/Ships'))
const Registration = lazy(() => import('./pages/Registration'))
const Declarations = lazy(() => import('./pages/Declarations'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const Analytics = lazy(() => import('./pages/Analytics'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

// React Joyride is intentionally disabled for the current UI stabilization phase.
// PageTour and tour definitions remain in the project history for later reactivation.
export default function App() {
  return <Layout><Suspense fallback={<LoadingScreen />}><Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/emeliyyatlar" element={<Navigate to="/gemiler" replace />} />
    <Route path="/gemiler" element={<Ships />} />
    <Route path="/qeydiyyat" element={<Registration />} />
    <Route path="/beyannameler" element={<Declarations />} />
    <Route path="/tarixce" element={<HistoryPage />} />
    <Route path="/analitika" element={<Analytics />} />
    <Route path="/parametrler" element={<SettingsPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></Layout>
}
