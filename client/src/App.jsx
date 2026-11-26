import { lazy, Suspense } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { LoadingScreen } from './components/Chrome.jsx'
import AudiencePage from './pages/Audience.jsx'

const StaffLayout = lazy(() => import('./pages/StaffLayout.jsx'))
const OwnerPage = lazy(() => import('./pages/OwnerPage.jsx'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AudiencePage />} />
      <Route element={<Suspense fallback={<LoadingScreen label="Cargando…" />}><StaffLayout /></Suspense>}>
        <Route path="/sala" element={<OwnerPage />} />
        <Route path="/presentador" element={<Navigate to="/sala" replace />} />
        <Route path="/editar" element={<Navigate to="/sala" replace state={{ mode: 'edit' }} />} />
      </Route>
      <Route path="*" element={<Missing />} />
    </Routes>
  )
}

function Missing() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-2xl font-semibold">Esta página no existe.</p>
        <Link className="mt-4 inline-block rounded-full px-4 py-2" style={{ background: 'var(--card)' }} to="/">Volver a la sala</Link>
      </div>
    </div>
  )
}
