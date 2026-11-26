import { hashSecret, secretMatches } from './auth.js'
import { defaultSession } from './defaultSlides.js'
import { prepareContent } from './validate.js'
import { isSafeId, sanitizeWords } from '../shared/text.js'

export async function createStore(db) {
  const participantsCol = db.collection('participants')
  const votesCol = db.collection('votes')
  const sessionCol = db.collection('session')
  const cache = {
    session: null,
    participants: new Map(),
    votes: new Map(),
  }

  const existing = await sessionCol.findOne({ _id: 'session' })
  if (!existing?.slides?.length) {
    const fresh = defaultSession()
    await sessionCol.replaceOne({ _id: 'session' }, { _id: 'session', ...fresh, updatedAt: new Date() }, { upsert: true })
    cache.session = fresh
  } else {
    const fallback = defaultSession()
    const slides = existing.slides
    let contentVersion = existing.contentVersion || 1
    let slideIndex = Number.isInteger(existing.slideIndex) ? existing.slideIndex : 0
    if (!existing.caso3Seeded) {
      const ids = new Set(slides.map((item) => item.id))
      const extra = fallback.slides.filter((item) => item.id.startsWith('s-caso3-') && !ids.has(item.id))
      if (extra.length) {
        slides.push(...extra)
        contentVersion += 1
      }
    }
    if (!existing.portadaSeeded && !slides.some((item) => item.id === 's-portada')) {
      const template = fallback.slides.find((item) => item.id === 's-portada')
      const service = slides.find((item) => item.id === 's-servicio') || slides.find((item) => item.role === 'service')
      slides.unshift({
        ...template,
        kicker: service?.kicker || template.kicker,
        title: service?.title || template.title,
        subtitle: service?.subtitle || template.subtitle,
      })
      if (service) {
        service.kicker = 'Tu servicio'
        service.title = service.question || '¿En qué servicio trabajás?'
        service.subtitle = ''
      }
      if (slideIndex > 0) slideIndex += 1
      contentVersion += 1
    }
    const legacyAt = slides.findIndex((item) => item.id === 's-servicio')
    if (legacyAt >= 0) {
      slides.splice(legacyAt, 1)
      if (slideIndex > legacyAt) slideIndex -= 1
      if (slideIndex >= slides.length) slideIndex = Math.max(0, slides.length - 1)
      contentVersion += 1
    }
    if (!existing.caso2Named) {
      const portada = slides.find((item) => item.id === 's-portada')
      const caso = slides.find((item) => item.id === 's-caso')
      if (portada && !String(portada.subtitle || '').includes('Caso clínico 2')) {
        portada.subtitle = 'Caso clínico 2 – Cuando el lactato cuenta una historia diferente'
      }
      if (caso && (caso.kicker === 'El caso' || !caso.kicker)) caso.kicker = 'Caso clínico 2'
      contentVersion += 1
    }
    if (!existing.disneaSeeded) {
      const ids = new Set(slides.map((item) => item.id))
      const extra = fallback.slides.filter((item) => item.id.startsWith('s-disnea-') && !ids.has(item.id))
      if (extra.length) {
        slides.unshift(...extra)
        slideIndex += extra.length
        contentVersion += 1
      }
    }
    let cierreMovido = false
    if (!existing.cierreAlFinal) {
      const at = slides.findIndex((item) => item.id === 's-caso3-mensajes')
      if (at >= 0 && at !== slides.length - 1) {
        const [cierre] = slides.splice(at, 1)
        slides.push(cierre)
        if (slideIndex === at) slideIndex = slides.length - 1
        else if (slideIndex > at) slideIndex -= 1
        contentVersion += 1
        cierreMovido = true
      }
    }
    cache.session = {
      slideIndex: Math.max(0, Math.min(slides.length - 1, slideIndex)),
      showResults: !!existing.showResults,
      contentVersion,
      slides,
      caso3Seeded: true,
      portadaSeeded: true,
      disneaSeeded: true,
      caso2Named: true,
      cierreAlFinal: true,
      design: existing.design?.background ? existing.design : fallback.design,
      priceTable: Array.isArray(existing.priceTable) ? existing.priceTable : fallback.priceTable,
    }
    if (!existing.caso3Seeded || !existing.portadaSeeded || !existing.disneaSeeded || !existing.caso2Named || legacyAt >= 0 || cierreMovido || !existing.cierreAlFinal) await persistSession()
  }

  for (const person of await participantsCol.find({}).toArray()) {
    cache.participants.set(person._id, {
      id: person._id,
      secretHash: person.secretHash,
      service: person.service || null,
    })
  }
  for (const vote of await votesCol.find({}).toArray()) {
    if (!cache.votes.has(vote.slideId)) cache.votes.set(vote.slideId, new Map())
    cache.votes.get(vote.slideId).set(vote.participantId, vote.value)
  }

  async function persistSession() {
    await sessionCol.replaceOne(
      { _id: 'session' },
      { _id: 'session', ...cache.session, updatedAt: new Date() },
      { upsert: true },
    )
  }

  function slideByRole(role) {
    return cache.session.slides.find((slide) => slide.role === role) || null
  }

  function voteMap(slideId) {
    if (!cache.votes.has(slideId)) cache.votes.set(slideId, new Map())
    return cache.votes.get(slideId)
  }

  async function rememberVote(participantId, slideId, value) {
    const map = voteMap(slideId)
    const prev = map.has(participantId) ? map.get(participantId) : undefined
    map.set(participantId, value)
    try {
      await votesCol.updateOne(
        { _id: `${participantId}:${slideId}` },
        { $set: { participantId, slideId, value, updatedAt: new Date() } },
        { upsert: true },
      )
    } catch (error) {
      if (map.get(participantId) === value) {
        if (prev === undefined) map.delete(participantId)
        else map.set(participantId, prev)
      }
      throw error
    }
  }

  async function forgetVote(participantId, slideId) {
    const map = cache.votes.get(slideId)
    const prev = map?.get(participantId)
    map?.delete(participantId)
    try {
      await votesCol.deleteOne({ _id: `${participantId}:${slideId}` })
    } catch (error) {
      if (prev !== undefined) voteMap(slideId).set(participantId, prev)
      throw error
    }
  }

  return {
    getSession() {
      return cache.session
    },
    serviceSlide() {
      return slideByRole('service')
    },
    studiesSlide() {
      return slideByRole('studies')
    },
    hypothesisSlide() {
      return slideByRole('hypothesis')
    },
    getParticipant(id) {
      return cache.participants.get(id) || null
    },
    serviceMap() {
      const map = new Map()
      for (const person of cache.participants.values()) {
        if (person.service) map.set(person.id, person.service)
      }
      return map
    },
    listVotes(slideId) {
      const map = cache.votes.get(slideId)
      if (!map) return []
      return [...map.entries()].map(([participantId, value]) => ({ participantId, value }))
    },
    voteOf(participantId, slideId) {
      if (!slideId) return null
      const value = cache.votes.get(slideId)?.get(participantId)
      return value === undefined ? null : value
    },
    exportBundle() {
      const votes = []
      for (const [slideId, map] of cache.votes) {
        for (const [participantId, value] of map) votes.push({ slideId, participantId, value })
      }
      return {
        slides: cache.session.slides,
        priceTable: cache.session.priceTable,
        participants: [...cache.participants.values()],
        votes,
      }
    },
    async claimParticipant(id, secret) {
      if (!isSafeId(id) || typeof secret !== 'string' || secret.length < 20 || secret.length > 200) {
        return { rejected: true }
      }
      const existing = cache.participants.get(id)
      if (existing) {
        if (!secretMatches(existing.secretHash, secret)) return { rejected: true }
        return { participant: existing }
      }
      const participant = { id, secretHash: hashSecret(secret), service: null }
      try {
        await participantsCol.insertOne({
          _id: id,
          secretHash: participant.secretHash,
          service: null,
          createdAt: new Date(),
        })
      } catch (error) {
        if (error?.code !== 11000) throw error
        const doc = await participantsCol.findOne({ _id: id })
        if (!doc || !secretMatches(doc.secretHash, secret)) return { rejected: true }
        const recovered = { id, secretHash: doc.secretHash, service: doc.service || null }
        cache.participants.set(id, recovered)
        return { participant: recovered }
      }
      cache.participants.set(id, participant)
      return { participant }
    },
    async setNavigation(index) {
      const max = Math.max(0, cache.session.slides.length - 1)
      const next = Number.isFinite(Number(index)) ? Math.max(0, Math.min(max, Math.trunc(Number(index)))) : cache.session.slideIndex
      if (next === cache.session.slideIndex) return
      cache.session.slideIndex = next
      cache.session.showResults = false
      await persistSession()
    },
    async setShowResults(show) {
      cache.session.showResults = !!show
      await persistSession()
    },
    async saveContent(incoming) {
      const prepared = prepareContent(cache.session.slides, incoming)
      cache.session.slides = prepared.slides
      cache.session.design = prepared.design
      cache.session.priceTable = prepared.priceTable
      if (cache.session.slideIndex >= prepared.slides.length) {
        cache.session.slideIndex = prepared.slides.length - 1
      }
      cache.session.contentVersion += 1
      await persistSession()
      return prepared
    },
    async restoreContent() {
      const fresh = defaultSession()
      cache.session.slides = fresh.slides
      cache.session.priceTable = fresh.priceTable
      cache.session.slideIndex = 0
      cache.session.showResults = false
      cache.session.contentVersion += 1
      await persistSession()
    },
    async resetVotes() {
      for (const person of cache.participants.values()) person.service = null
      cache.votes.clear()
      cache.session.showResults = false
      await votesCol.deleteMany({})
      await participantsCol.updateMany({}, { $set: { service: null } })
      await persistSession()
    },
    async castVote(participantId, payload) {
      const participant = cache.participants.get(participantId)
      if (!participant) throw new Error('No identificamos tu sesión')
      if (!isSafeId(payload?.slideId)) throw new Error('Esa pregunta no está disponible')
      const slide = cache.session.slides.find((item) => item.id === payload.slideId)
      if (!slide) throw new Error('Esa pregunta no está disponible')
      const index = cache.session.slides.findIndex((item) => item.id === slide.id)
      const isCurrent = index === cache.session.slideIndex
      if (slide.role === 'service') {
        if (participant.service && !isCurrent) throw new Error('Esta pregunta está cerrada')
      } else if (slide.type === 'single' || slide.type === 'multi' || slide.type === 'words') {
        if (!isCurrent) throw new Error('Esta pregunta está cerrada')
      } else {
        throw new Error('Esta diapositiva no recibe votos')
      }

      if (slide.type === 'words') {
        const value = sanitizeWords(payload.value, slide.maxWords || 5)
        if (!value.length) {
          await forgetVote(participantId, slide.id)
          return null
        }
        await rememberVote(participantId, slide.id, value)
        return value
      }

      if (slide.type === 'single') {
        const optionId = typeof payload.value === 'string' ? payload.value : ''
        if (!slide.options.some((option) => option.id === optionId)) throw new Error('Esa opción no existe')
        if (slide.role === 'service') {
          const previous = participant.service
          participant.service = optionId
          try {
            await participantsCol.updateOne({ _id: participant.id }, { $set: { service: optionId } })
            await rememberVote(participantId, slide.id, optionId)
          } catch (error) {
            participant.service = previous
            throw error
          }
          return optionId
        }
        await rememberVote(participantId, slide.id, optionId)
        return optionId
      }

      if (!Array.isArray(payload.value)) throw new Error('Voto inválido')
      const allowed = new Set(slide.options.map((option) => option.id))
      const picked = []
      for (const raw of payload.value) {
        const optionId = String(raw)
        if (!allowed.has(optionId) || picked.includes(optionId)) continue
        picked.push(optionId)
      }
      const max = slide.maxSelect || slide.options.length
      if (picked.length > max) throw new Error(max === 1 ? 'Podés elegir una sola opción' : `Máximo ${max} opciones`)
      if (!picked.length) {
        await forgetVote(participantId, slide.id)
        return null
      }
      const value = slide.options.map((option) => option.id).filter((optionId) => picked.includes(optionId))
      await rememberVote(participantId, slide.id, value)
      return value
    },
  }
}
