import { DEFAULT_DESIGN, FONT_STACKS } from '../shared/design.js'
import { cleanLine, isSafeId, newId } from '../shared/text.js'

const ROLES = ['service', 'hypothesis', 'studies', 'cost']
const REQUIRED_ROLES = ['hypothesis', 'studies', 'cost']
const ROLE_TYPE = { service: 'single', hypothesis: 'single', studies: 'multi', cost: 'cost' }
const TYPES = new Set(['text', 'single', 'multi', 'words', 'cost'])
const VARIANTS = new Set(['plain', 'case', 'labs', 'reveal', 'criteria', 'evolution', 'takeaways', 'panels', 'bars', 'spotlight'])
const SKINS = new Set(['claro', 'tarjeta', 'oscuro', 'centrado', 'franja'])

function relinkOptions(previous, drafts) {
  const used = new Set()
  const next = drafts.map((draft) => ({
    ...draft,
    id: isSafeId(draft.id) ? draft.id : null,
  }))
  for (const option of next) {
    if (option.id && !used.has(option.id)) used.add(option.id)
    else option.id = null
  }
  const pool = (previous || []).filter((option) => !used.has(option.id))
  for (const option of next) {
    if (option.id) continue
    const index = pool.findIndex((item) => item.label === option.label)
    if (index >= 0) {
      option.id = pool[index].id
      pool.splice(index, 1)
    }
  }
  const missing = next.filter((option) => !option.id)
  if (missing.length === 1 && pool.length === 1) missing[0].id = pool[0].id
  for (const option of next) {
    if (!option.id) option.id = newId()
  }
  return next
}

function cleanOptions(rawOptions, previous, priced) {
  const source = Array.isArray(rawOptions) ? rawOptions.slice(0, 20) : []
  const drafts = []
  for (const raw of source) {
    const label = cleanLine(raw?.label, 180)
    if (!label) continue
    let price = null
    if (priced) {
      const value = Number(raw?.price)
      if (!Number.isFinite(value) || value < 0 || value > 100000000) {
        throw new Error(`Precio inválido en "${label}"`)
      }
      price = Math.round(value)
    }
    drafts.push({
      id: raw?.id,
      label,
      price,
      note: cleanLine(raw?.note, 120),
    })
  }
  return relinkOptions(previous, drafts)
}

function cleanSlide(raw, previous) {
  const type = TYPES.has(raw?.type) ? raw.type : previous?.type || 'text'
  const role = ROLES.includes(raw?.role) ? raw.role : null
  const priced = role === 'studies' || (Array.isArray(raw?.options) && raw.options.some((option) => option?.price != null && option.price !== ''))
  const collects = type === 'single' || type === 'multi' || type === 'words'
  let maxSelect = null
  if (type === 'multi' && raw?.maxSelect != null && raw.maxSelect !== '') {
    const value = Number(raw.maxSelect)
    if (!Number.isInteger(value) || value < 1 || value > 20) {
      throw new Error('El máximo de selecciones tiene que ser un número de 1 a 20')
    }
    maxSelect = value
  }
  const maxWords = type === 'words'
    ? Math.min(5, Math.max(1, Number.isInteger(Number(raw?.maxWords)) ? Number(raw.maxWords) : 5))
    : 5
  const body = (Array.isArray(raw?.body) ? raw.body : [])
    .slice(0, 10)
    .map((line) => cleanLine(line, 320))
    .filter(Boolean)
  const cards = (Array.isArray(raw?.cards) ? raw.cards : [])
    .slice(0, 8)
    .map((card) => ({
      label: cleanLine(card?.label, 80),
      value: cleanLine(card?.value, 80),
      points: (Array.isArray(card?.points) ? card.points : [])
        .slice(0, 8)
        .map((point) => cleanLine(point, 240))
        .filter(Boolean),
    }))
    .filter((card) => card.label && (card.value || card.points.length))
  const slide = {
    id: previous?.id || (isSafeId(raw?.id) ? raw.id : newId()),
    type,
    role,
    locked: false,
    variant: VARIANTS.has(raw?.variant) ? raw.variant : 'plain',
    skin: SKINS.has(raw?.skin) ? raw.skin : 'claro',
    kicker: cleanLine(raw?.kicker, 70),
    title: cleanLine(raw?.title, 140),
    subtitle: cleanLine(raw?.subtitle, 180),
    body,
    cards,
    question: cleanLine(raw?.question, 280),
    options: type === 'single' || type === 'multi' ? cleanOptions(raw?.options, previous?.options, priced && role !== 'service') : [],
    maxSelect,
    maxWords,
    wordMode: raw?.wordMode === 'list' ? 'list' : 'cloud',
    ranking: type === 'multi' && raw?.ranking === true,
    footnote: cleanLine(raw?.footnote, 400),
  }
  if (collects && !slide.question) throw new Error('Hay una diapositiva con votación y sin pregunta')
  return slide
}

function cleanDesign(raw) {
  const design = { ...DEFAULT_DESIGN }
  for (const key of ['accent1', 'accent2', 'background', 'card', 'text']) {
    const value = String(raw?.[key] || '').trim()
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw new Error('Hay un color inválido')
    design[key] = value.toLowerCase()
  }
  const scale = Number(raw?.fontScale)
  if (!Number.isFinite(scale) || scale < 80 || scale > 170) {
    throw new Error('El tamaño de texto tiene que estar entre 80% y 170%')
  }
  if (!FONT_STACKS[raw?.font]) throw new Error('Esa tipografía no está disponible')
  design.fontScale = Math.round(scale)
  design.font = raw.font
  return design
}

function cleanPriceTable(rows) {
  if (!Array.isArray(rows)) throw new Error('Falta la tabla de referencia')
  if (rows.length > 20) throw new Error('La tabla de referencia es demasiado larga')
  const used = new Set()
  const table = []
  for (const raw of rows) {
    const label = cleanLine(raw?.label, 160)
    if (!label) continue
    const price = Number(raw?.price)
    if (!Number.isFinite(price) || price < 0 || price > 100000000) throw new Error(`Precio inválido en "${label}"`)
    let id = isSafeId(raw?.id) && !used.has(raw.id) ? raw.id : newId()
    used.add(id)
    table.push({ id, label, price: Math.round(price) })
  }
  return table
}

export function prepareContent(previousSlides, incoming) {
  if (!incoming || !Array.isArray(incoming.slides)) throw new Error('Faltan las diapositivas')
  if (incoming.slides.length < 4 || incoming.slides.length > 40) {
    throw new Error('La cantidad de diapositivas no es válida')
  }
  const previous = Array.isArray(previousSlides) ? previousSlides : []
  const prevById = new Map(previous.map((slide) => [slide.id, slide]))
  const prevByRole = new Map(previous.filter((slide) => slide.role).map((slide) => [slide.role, slide]))
  const slides = incoming.slides.map((raw) => cleanSlide(raw, prevById.get(raw?.id)))
  const ids = new Set()
  for (const slide of slides) {
    if (ids.has(slide.id)) throw new Error('Hay dos diapositivas con el mismo identificador')
    ids.add(slide.id)
  }
  for (const role of REQUIRED_ROLES) {
    const found = slides.filter((slide) => slide.role === role)
    if (found.length !== 1) throw new Error('No se puede quitar una diapositiva base del análisis')
    const prev = prevByRole.get(role)
    if (prev && found[0].id !== prev.id) throw new Error('No se puede reemplazar una diapositiva base')
    found[0].role = role
    found[0].type = ROLE_TYPE[role]
    found[0].locked = true
  }
  const kept = slides.filter((slide) => slide.id !== 's-servicio')
  const serviceSlides = kept.filter((slide) => slide.role === 'service')
  if (serviceSlides.length > 1) throw new Error('Solo puede haber una pregunta de área')
  for (const slide of kept) {
    if (slide.role === 'service') {
      slide.type = ROLE_TYPE.service
      slide.locked = true
    } else if (!slide.role) slide.locked = false
    if ((slide.type === 'single' || slide.type === 'multi') && slide.options.length < 2) {
      throw new Error(`«${slide.title || slide.question || 'Pregunta'}» necesita al menos dos opciones`)
    }
    if (slide.type === 'multi' && slide.maxSelect && slide.maxSelect > slide.options.length) {
      slide.maxSelect = slide.options.length
    }
  }
  return {
    slides: kept,
    design: cleanDesign(incoming.design),
    priceTable: cleanPriceTable(incoming.priceTable),
  }
}
