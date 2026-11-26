import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { emitAck } from '../lib/socket.js'

const PresenterContext = createContext(null)

export function PresenterProvider({ token, onInvalid, children }) {
  const [state, setState] = useState(null)
  const [status, setStatus] = useState('connecting')
  const socketRef = useRef(null)
  const invalidRef = useRef(onInvalid)
  invalidRef.current = onInvalid

  useEffect(() => {
    const socket = io({
      auth: { role: 'presenter', token },
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      timeout: 10000,
    })
    socketRef.current = socket
    socket.on('presenter-sync', (payload) => {
      setState(payload)
      setStatus('live')
    })
    socket.on('disconnect', () => setStatus((current) => (current === 'live' ? 'reconnecting' : current)))
    socket.on('connect_error', (error) => {
      if (String(error?.message || '').includes('unauthorized')) {
        socket.disconnect()
        invalidRef.current()
        return
      }
      setStatus((current) => (current === 'live' ? 'reconnecting' : 'offline'))
    })
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  const actions = useMemo(() => ({
    go: (index) => emitAck(socketRef.current, 'go', { index }),
    results: (show) => emitAck(socketRef.current, 'results', { show }),
    reset: () => emitAck(socketRef.current, 'reset', {}),
    save: (content) => emitAck(socketRef.current, 'save', content),
    restore: () => emitAck(socketRef.current, 'restore', {}),
  }), [])

  const value = useMemo(() => ({ state, status, actions }), [state, status, actions])
  return <PresenterContext.Provider value={value}>{children}</PresenterContext.Provider>
}

export function usePresenter() {
  const value = useContext(PresenterContext)
  if (!value) throw new Error('Falta la sesión del presentador')
  return value
}
