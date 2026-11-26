import { io } from 'socket.io-client'

const base = process.env.ATENEO_URL || 'http://localhost:3001'
const total = Number(process.env.N || 100)
const key = process.env.PRESENTER_KEY || 'ateneo'

function connect(auth) {
  return new Promise((resolve, reject) => {
    const socket = io(base, { auth, transports: ['websocket'], timeout: 20000 })
    const timer = setTimeout(() => reject(new Error('tiempo de conexión agotado')), 20000)
    socket.on('connect_error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    const event = auth.role === 'presenter' ? 'presenter-sync' : 'sync'
    socket.once(event, (payload) => {
      clearTimeout(timer)
      resolve({ socket, payload })
    })
  })
}

function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(8000).emit(event, payload, (error, response) => {
      if (error || !response?.ok) reject(new Error(response?.error || error?.message || event))
      else resolve(response)
    })
  })
}

const auth = await fetch(`${base}/api/auth`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key }),
}).then((response) => response.json())
if (!auth.token) throw new Error(auth.error || 'No se pudo entrar como presentador')

const presenter = await connect({ role: 'presenter', token: auth.token })
const slides = presenter.payload.slides
const service = slides.find((slide) => slide.role === 'service')
const hypothesis = slides.find((slide) => slide.role === 'hypothesis')
const hypothesisIndex = slides.findIndex((slide) => slide.role === 'hypothesis')
const groups = service.options.map((option) => option.id)
const ideas = hypothesis.options.map((option) => option.id)

const started = Date.now()
const people = await Promise.all(Array.from({ length: total }, () => connect({
  role: 'audience',
  participantId: crypto.randomUUID(),
  secret: `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, ''),
})))

await Promise.all(people.map(({ socket }, index) => emit(socket, 'vote', {
  slideId: service.id,
  value: groups[index % groups.length],
})))
await emit(presenter.socket, 'go', { index: hypothesisIndex })
await Promise.all(people.map(({ socket }, index) => emit(socket, 'vote', {
  slideId: hypothesis.id,
  value: ideas[index % ideas.length],
})))
await emit(presenter.socket, 'results', { show: true })

const seen = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('los resultados no llegaron a tiempo')), 10000)
  presenter.socket.on('presenter-sync', (payload) => {
    if (payload.results?.kind === 'choice' && payload.results.total >= total && payload.connected >= total) {
      clearTimeout(timer)
      resolve(payload)
    }
  })
})

const elapsed = Date.now() - started
console.log(`${total} participantes votaron en ${elapsed} ms. Conectados: ${seen.connected}. Respuestas: ${seen.results.total}.`)
people.forEach(({ socket }) => socket.disconnect())
presenter.socket.disconnect()
if (elapsed > 8000) {
  console.error('La sala tardó más de 8 segundos.')
  process.exit(1)
}
