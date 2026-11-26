import { countAnswers, participantCost, summarize } from '../shared/aggregate.js'
import { groupDefs } from '../shared/groups.js'

export function attachLive(io, store) {
  const socketsByParticipant = new Map()
  const tails = new Map()
  const hits = new Map()
  let timer = null
  let running = false
  let again = false

  function limited(id) {
    const now = Date.now()
    const recent = (hits.get(id) || []).filter((stamp) => now - stamp < 2000)
    if (recent.length >= 15) {
      hits.set(id, recent)
      return true
    }
    recent.push(now)
    hits.set(id, recent)
    return false
  }

  function enqueue(id, task) {
    const previous = tails.get(id) || Promise.resolve()
    const run = previous.then(task, task)
    tails.set(id, run.then(() => {}, () => {}))
    return run
  }

  function snapshot() {
    const session = store.getSession()
    const slide = session.slides[session.slideIndex] || null
    const votes = slide ? store.listVotes(slide.id) : []
    const visible = !!session.showResults || slide?.type === 'cost' || slide?.role === 'cost'
    const results = slide && visible
      ? summarize(slide, {
        groups: groupDefs(store.serviceSlide()),
        votes,
        serviceByParticipant: store.serviceMap(),
        studiesSlide: store.studiesSlide(),
        hypothesisSlide: store.hypothesisSlide(),
        studyVotes: store.listVotes(store.studiesSlide()?.id),
        hypothesisVotes: store.listVotes(store.hypothesisSlide()?.id),
      })
      : null
    return { session, slide, results, answered: countAnswers(slide, votes) }
  }

  function servicePrompt(session) {
    const slide = session.slides.find((item) => item.role === 'service')
    if (!slide) return null
    return {
      slideId: slide.id,
      title: slide.title,
      subtitle: slide.subtitle,
      question: slide.question,
      options: (slide.options || []).map((option) => ({ id: option.id, label: option.label })),
    }
  }

  function audienceBase(snap) {
    const { session, slide, results, answered } = snap
    const isCost = slide?.type === 'cost' || slide?.role === 'cost'
    return {
      slideIndex: session.slideIndex,
      slideCount: session.slides.length,
      showResults: !!session.showResults,
      slide,
      design: session.design,
      results,
      connected: socketsByParticipant.size,
      answered,
      servicePrompt: servicePrompt(session),
      priceTable: isCost ? session.priceTable : [],
      contentVersion: session.contentVersion,
    }
  }

  function presenterPayload(snap) {
    return {
      ...audienceBase(snap),
      slides: snap.session.slides,
      priceTable: snap.session.priceTable,
    }
  }

  function personal(base, participantId) {
    const studies = store.studiesSlide()
    const studyVote = store.voteOf(participantId, studies?.id)
    return {
      ...base,
      myVote: store.voteOf(participantId, base.slide?.id) ?? null,
      myService: store.getParticipant(participantId)?.service ?? null,
      myCost: Array.isArray(studyVote) ? participantCost(studies, studyVote) : null,
    }
  }

  async function emitAll() {
    const snap = snapshot()
    const base = audienceBase(snap)
    for (const [participantId, sockets] of socketsByParticipant) {
      const payload = personal(base, participantId)
      for (const socketId of sockets) io.to(socketId).emit('sync', payload)
    }
    io.to('presenters').emit('presenter-sync', presenterPayload(snap))
  }

  async function flush() {
    if (running) {
      again = true
      return
    }
    running = true
    try {
      do {
        again = false
        await emitAll()
      } while (again)
    } catch (error) {
      console.error(error)
    } finally {
      running = false
    }
  }

  function schedule(immediate = false) {
    if (immediate) {
      clearTimeout(timer)
      timer = null
      void flush()
      return
    }
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      void flush()
    }, 80)
  }

  function ackResult(ack, body) {
    if (typeof ack === 'function') ack(body)
  }

  io.on('connection', (socket) => {
    if (socket.data.role === 'presenter') {
      socket.join('presenters')
      socket.emit('presenter-sync', presenterPayload(snapshot()))

      const handle = (event, task) => {
        socket.on(event, (payload, ack) => {
          enqueue('presenter', async () => {
            try {
              const result = await task(payload)
              ackResult(ack, { ok: true, ...result })
              schedule(true)
            } catch (error) {
              ackResult(ack, { ok: false, error: error.message || 'No se pudo completar la acción' })
            }
          })
        })
      }

      handle('go', async (payload) => {
        await store.setNavigation(payload?.index)
        return {}
      })
      handle('results', async (payload) => {
        await store.setShowResults(!!payload?.show)
        return {}
      })
      handle('reset', async () => {
        await store.resetVotes()
        return {}
      })
      handle('save', async (payload) => {
        const saved = await store.saveContent(payload)
        return { ...saved, contentVersion: store.getSession().contentVersion }
      })
      handle('restore', async () => {
        await store.restoreContent()
        const session = store.getSession()
        return {
          slides: session.slides,
          design: session.design,
          priceTable: session.priceTable,
          contentVersion: session.contentVersion,
        }
      })
      return
    }

    const participantId = socket.data.participantId
    if (!socketsByParticipant.has(participantId)) socketsByParticipant.set(participantId, new Set())
    const bucket = socketsByParticipant.get(participantId)
    const first = bucket.size === 0
    bucket.add(socket.id)
    socket.emit('sync', personal(audienceBase(snapshot()), participantId))
    if (first) schedule()

    socket.on('vote', (payload, ack) => {
      if (limited(participantId)) {
        ackResult(ack, { ok: false, error: 'Esperá un segundo y volvé a intentar' })
        return
      }
      enqueue(participantId, async () => {
        try {
          const value = await store.castVote(participantId, payload)
          ackResult(ack, { ok: true, value })
          schedule()
        } catch (error) {
          ackResult(ack, { ok: false, error: error.message || 'No se pudo registrar el voto' })
        }
      })
    })

    socket.on('disconnect', () => {
      bucket.delete(socket.id)
      if (bucket.size === 0) {
        socketsByParticipant.delete(participantId)
        schedule()
      }
    })
  })
}
