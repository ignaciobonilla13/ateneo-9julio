import { Suspense, useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LoadingScreen, PasswordGate } from '../components/Chrome.jsx'
import { clearToken, loadToken } from '../lib/identity.js'
import { PresenterProvider } from '../realtime/PresenterContext.jsx'

export default function StaffLayout() {
  const [token, setToken] = useState(() => loadToken())
  const drop = useCallback(() => {
    clearToken()
    setToken('')
  }, [])
  if (!token) return <PasswordGate onToken={setToken} />
  return (
    <PresenterProvider token={token} onInvalid={drop}>
      <Suspense fallback={<LoadingScreen label="Cargando…" />}>
        <Outlet />
      </Suspense>
    </PresenterProvider>
  )
}
