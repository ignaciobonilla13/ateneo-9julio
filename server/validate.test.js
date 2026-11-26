import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultSession, defaultSlides } from './defaultSlides.js'
import { prepareContent } from './validate.js'

test('el caso precargado tiene 17 diapositivas y no adelanta el diagnóstico', () => {
  const slides = defaultSlides()
  assert.equal(slides.length, 17)
  assert.deepEqual(
    slides.filter((slide) => slide.locked).map((slide) => slide.role),
    ['service', 'hypothesis', 'studies', 'cost'],
  )
  assert.match(`${slides[11].title} ${slides[11].subtitle}`, /MALA|metformina/)
  for (const slide of slides.slice(0, 11)) {
    assert.equal(JSON.stringify(slide).includes('MALA'), false)
  }
  const studies = slides.find((slide) => slide.role === 'studies')
  assert.equal(studies.options.find((option) => option.id === 'gas').price, 0)
  assert.equal(studies.options.find((option) => option.id === 'tac').price, 396000)
  assert.equal(studies.options.find((option) => option.id === 'utidia').price, 885500)
  assert.equal(slides.find((slide) => slide.id === 's-ranking').maxSelect, 2)
})

test('guardar conserva las diapositivas base y un cambio de texto', () => {
  const session = defaultSession()
  const incoming = structuredClone(session)
  incoming.slides[1].title = 'Varón de 73 años'
  const saved = prepareContent(session.slides, incoming)
  assert.equal(saved.slides[1].title, 'Varón de 73 años')
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

test('rechaza un color o un tamaño de texto fuera de rango', () => {
  const session = defaultSession()
  const incoming = structuredClone(session)
  incoming.design.fontScale = 200
  assert.throws(() => prepareContent(session.slides, incoming), /80%/)
  incoming.design.fontScale = 100
  incoming.design.accent1 = 'rojo'
  assert.throws(() => prepareContent(session.slides, incoming), /color/)
})
