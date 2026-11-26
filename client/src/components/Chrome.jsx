import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { saveToken } from '../lib/identity.js'

export function ProgressBar({ index, count, position = 'fixed' }) {
  const width = count ? ((index + 1) / count) * 100 : 0
  return (
    <div className={`${position} left-0 right-0 top-0 z-30 h-[3px]`} style={{ background: 'var(--line)' }}>
      <div className="h-full" style={{ width: `${width}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
    </div>
  )
}

export function LoadingScreen({ label = 'Conectando con la sala…', action = null, actionLabel = 'Reintentar' }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <div className="mx-auto mb-5 h-1.5 w-28 overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
          <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: 'var(--accent)' }} />
        </div>
        <p className="text-lg">{label}</p>
        {action && (
          <button type="button" className="mt-5 rounded-full px-4 py-2" style={{ background: 'var(--card)' }} onClick={action}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export function Modal({ title, body, confirmLabel, danger = false, onConfirm, onClose }) {
  const cancelRef = useRef(null)
  useEffect(() => { cancelRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl border p-6"
        style={{ background: 'var(--card)', borderColor: 'var(--line)', color: 'var(--text)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--muted)' }}>{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="rounded-full px-4 py-2" onClick={onClose}>Cancelar</button>
          <button type="button" className="rounded-full px-4 py-2 font-semibold text-white" style={{ background: danger ? 'var(--accent)' : 'var(--accent2)', color: danger ? 'white' : '#1b1008' }} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PasswordGate({ onToken }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(payload.error || 'Clave incorrecta')
        return
      }
      saveToken(payload.token)
      onToken(payload.token)
    } catch {
      setError('No hay conexión con el servidor')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
        <p className="kicker">Dueño de la sala</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Clave de la sala</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>Con esta clave proyectás y editás. No hace falta crear una cuenta.</p>
        <label className="mt-6 block">
          <span className="field-label">Clave</span>
          <input type="password" autoFocus required className="field" autoComplete="current-password" value={key} onChange={(event) => setKey(event.target.value)} />
        </label>
        <p className="mt-3 min-h-5 text-sm" style={{ color: 'var(--accent)' }} role="alert">{error}</p>
        <button type="submit" disabled={busy} className="mt-4 w-full rounded-2xl py-3 font-semibold text-white" style={{ background: 'var(--accent)' }}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <Link to="/" className="mt-4 block text-center text-sm" style={{ color: 'var(--muted)' }}>Volver a la sala</Link>
      </form>
    </div>
  )
}
