import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultSession, defaultSlides } from './defaultSlides.js'
import { prepareContent } from './validate.js'

test('el caso precargado tiene 36 diapositivas y no adelanta el diagnóstico', () => {
  const slides = defaultSlides()
  assert.equal(slides.length, 36)
  assert.equal(slides[0].id, 's-disnea-portada')
  assert.equal(slides[0].type, 'text')
  const service = slides.find((slide) => slide.role === 'service')
  assert.equal(service.id, 's-disnea-servicio')
  assert.deepEqual(service.options.map((option) => option.id), ['clinica', 'uti', 'uco', 'otros'])
  assert.equal(slides.findIndex((slide) => slide.id === 's-portada'), 12)
  assert.match(slides.find((slide) => slide.id === 's-portada').subtitle, /Caso clínico 2/)
  assert.equal(slides.find((slide) => slide.id === 's-caso').kicker, 'Caso clínico 2')
  assert.deepEqual(
    slides.filter((slide) => slide.locked).map((slide) => slide.role),
    ['service', 'hypothesis', 'studies', 'cost'],
  )
  const diagnosisAt = slides.findIndex((slide) => slide.id === 's-diagnostico')
  assert.match(`${slides[diagnosisAt].title} ${slides[diagnosisAt].subtitle}`, /MALA|metformina/)
  for (const slide of slides.slice(0, diagnosisAt)) {
    assert.equal(JSON.stringify(slide).includes('MALA'), false)
  }
  const studies = slides.find((slide) => slide.role === 'studies')
  assert.equal(studies.options.find((option) => option.id === 'gas').price, 0)
  assert.equal(studies.options.find((option) => option.id === 'tac').price, 396000)
  assert.equal(studies.options.find((option) => option.id === 'utidia').price, 885500)
  assert.equal(slides.find((slide) => slide.id === 's-ranking').maxSelect, 2)
})

test('guardar conserva el área del caso de disnea y descarta el voto viejo', () => {
  const session = defaultSession()
  const incoming = structuredClone(session)
  incoming.slides.splice(1, 0, {
    id: 's-servicio',
    type: 'single',
    role: 'service',
    locked: true,
    title: '¿En qué servicio trabajás?',
    question: '¿En qué servicio trabajás?',
    options: [
      { id: 'uti', label: 'UTI' },
      { id: 'clinica', label: 'Clínica' },
      { id: 'uco', label: 'UCO' },
    ],
  })
  const saved = prepareContent(session.slides, incoming)
  assert.equal(saved.slides.some((slide) => slide.id === 's-servicio'), false)
  assert.equal(saved.slides.filter((slide) => slide.role === 'service').length, 1)
  assert.equal(saved.slides.find((slide) => slide.role === 'service').id, 's-disnea-servicio')
})

test('guardar conserva las diapositivas base y un cambio de texto', () => {
  const session = defaultSession()
  const incoming = structuredClone(session)
  const caso = incoming.slides.find((slide) => slide.id === 's-caso')
  caso.title = 'Varón de 73 años'
  const saved = prepareContent(session.slides, incoming)
  assert.equal(saved.slides.find((slide) => slide.id === 's-caso').title, 'Varón de 73 años')
  assert.equal(saved.slides.find((slide) => slide.role === 'studies').id, 's-estudios')
  assert.equal(saved.priceTable.find((row) => row.id === 'ruta').price, 177000)
})

test('no deja borrar la diapositiva de costo ni cambiar su identidad', () => {
  const session = defaultSession()
  const withoutCost = structuredClone(session)
  withoutCost.slides = withoutCost.slides.filter((slide) => slide.role !== 'cost')
  assert.throws(() => prepareContent(session.slides, withoutCost), /base del análisis/)

  const replaced = structuredClone(session)
  const cost = replaced.slides.find((slide) => slide.role === 'cost')
  cost.id = 'otra-cosa'
  assert.throws(() => prepareContent(session.slides, replaced), /reemplazar/)
})

test('una diapositiva suelta puede pasar de opciones a texto', () => {
  const session = defaultSession()
  const incoming = structuredClone(session)
  const ranking = incoming.slides.find((slide) => slide.id === 's-ranking')
  ranking.type = 'text'
  const saved = prepareContent(session.slides, incoming)
  const next = saved.slides.find((slide) => slide.id === 's-ranking')
  assert.equal(next.type, 'text')
  assert.equal(next.options.length, 0)
})

test('el diseño de una diapositiva se conserva', () => {
  const session = defaultSession()
  const incoming = structuredClone(session)
  incoming.slides[1].skin = 'oscuro'
  assert.equal(prepareContent(session.slides, incoming).slides[1].skin, 'oscuro')
  incoming.slides[1].skin = 'raro'
  assert.equal(prepareContent(session.slides, incoming).slides[1].skin, 'claro')
})

test('los recuadros con viñetas se conservan', () => {
  const session = defaultSession()
  const saved = prepareContent(session.slides, structuredClone(session))
  const panels = saved.slides.find((slide) => slide.id === 's-caso3-estudios')
  assert.equal(panels.cards.length, 4)
  assert.equal(panels.cards[0].points.length, 3)
  assert.equal(saved.slides.at(-1).variant, 'bars')
})

test('rechaza un color o un tamaño de texto fuera de rango', () => {
  const session = defaultSession()
  const incoming = structuredClone(session)
  incoming.design.fontScale = 200
  assert.throws(() => prepareContent(session.slides, incoming), /80%/)
  incoming.design.fontScale = 100
  incoming.design.accent1 = 'rojo'
  assert.throws(() => prepareContent(session.slides, incoming), /color/)
})
