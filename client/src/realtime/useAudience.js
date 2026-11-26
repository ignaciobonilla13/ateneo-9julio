import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { loadIdentity, rotateIdentity } from '../lib/identity.js'
import { emitAck } from '../lib/socket.js'

export function useAudience() {
  const [status, setStatus] = useState('connecting')
  const [sync, setSync] = useState(null)
  const socketRef = useRef(null)
  const retries = useRef(0)

  useEffect(() => {
    const identity = loadIdentity()
    const socket = io({
      auth: { role: 'audience', ...identity },
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      timeout: 10000,
    })
    socketRef.current = socket
    socket.on('sync', (payload) => {
      setSync(payload)
      setStatus('live')
      retries.current = 0
    })
    socket.on('disconnect', () => {
      setStatus((current) => (current === 'live' ? 'reconnecting' : current))
    })
    socket.on('connect_error', (error) => {
      if (String(error?.message || '').includes('identity') && retries.current < 2) {
        retries.current += 1
        const next = rotateIdentity()
        socket.auth = { role: 'audience', ...next }
        return
      }
      setStatus((current) => (current === 'live' || current === 'reconnecting' ? 'reconnecting' : 'offline'))
    })
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const vote = useCallback((slideId, value) => emitAck(socketRef.current, 'vote', { slideId, value }), [])
  return { status, sync, vote }
}
