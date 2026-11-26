import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCards, parseOptionLines, parsePrice, sanitizeWord, sanitizeWords } from './text.js'
import { formatPct, money } from './format.js'

test('interpreta precios en formato argentino', () => {
  assert.equal(parsePrice('61000'), 61000)
  assert.equal(parsePrice('$61.000'), 61000)
  assert.equal(parsePrice('1.328.250'), 1328250)
  assert.equal(parsePrice('303.600'), 303600)
  assert.equal(parsePrice('0'), 0)
  assert.throws(() => parsePrice('-5'))
})

test('formatea dinero y porcentajes', () => {
  assert.equal(money(61000), '$61.000')
  assert.equal(money(0), '$0')
  assert.equal(money(1328250), '$1.328.250')
  assert.equal(formatPct(33.333), '33,3%')
  assert.equal(formatPct(50), '50%')
})

test('limpia palabras de la nube', () => {
  assert.equal(sanitizeWord('  <b>Oliguria</b>  '), 'Oliguria')
  assert.equal(sanitizeWord('<script>alert(1)</script>'), 'alert(1)')
  assert.equal(sanitizeWord('***'), '')
  assert.equal(sanitizeWord('a'.repeat(80)).length, 40)
  assert.deepEqual(sanitizeWords(['Oliguria', 'oliguria', 'Fiebre', '', 'Dolor'], 5), ['Oliguria', 'Fiebre', 'Dolor'])
  assert.equal(sanitizeWords(['a', 'b', 'c', 'd', 'e', 'f'], 5).length, 5)
})

test('lee el formato estudio | precio | nota', () => {
  const parsed = parseOptionLines('ECG | 61000\nTAC abdomen | 396000 | TAC + contraste\n', { priced: true })
  assert.equal(parsed.errors.length, 0)
  assert.equal(parsed.options[0].label, 'ECG')
  assert.equal(parsed.options[0].price, 61000)
  assert.equal(parsed.options[1].note, 'TAC + contraste')
  const broken = parseOptionLines('Eco | no-es-precio', { priced: true })
  assert.equal(broken.errors.length, 1)
})

test('lee tarjetas etiqueta | valor', () => {
  assert.deepEqual(parseCards('pH | 7,05\n\nLactato | 16,8 mmol/L'), [
    { label: 'pH', value: '7,05' },
    { label: 'Lactato', value: '16,8 mmol/L' },
  ])
})
