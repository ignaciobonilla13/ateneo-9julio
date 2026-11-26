export function emitAck(socket, event, payload) {
  return new Promise((resolve) => {
    if (!socket?.connected && !socket) {
      resolve({ ok: false, error: 'Sin conexión' })
      return
    }
    socket.timeout(8000).emit(event, payload ?? {}, (error, response) => {
      if (error) resolve({ ok: false, error: 'Sin respuesta del servidor' })
      else resolve(response || { ok: false, error: 'Sin respuesta del servidor' })
    })
  })
}
