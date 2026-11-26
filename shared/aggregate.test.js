import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateChoice, aggregateCost, aggregateWords, brainstormWords, buildCostPeople, summarize } from './aggregate.js'
import { percent } from './format.js'

const groups = [
  { id: 'uti', label: 'UTI' },
  { id: 'clinica', label: 'Clínica' },
  { id: 'uco', label: 'UCO' },
]

test('agrupa una opción única y marca empate y sin servicio', () => {
  const slide = {
    type: 'single',
    options: [
      { id: 'a', label: 'Sepsis' },
      { id: 'b', label: 'Isquemia' },
    ],
  }
  const service = new Map([
    ['p1', 'uti'],
    ['p2', 'uti'],
    ['p3', 'clinica'],
  ])
  const result = aggregateChoice({
    slide,
    groups,
    serviceByParticipant: service,
    votes: [
      { participantId: 'p1', value: 'a' },
      { participantId: 'p2', value: 'b' },
      { participantId: 'p3', value: 'a' },
      { participantId: 'p4', value: 'a' },
    ],
  })
  assert.equal(result.total, 4)
  assert.equal(result.unassigned, 1)
  assert.equal(result.groups[0].n, 2)
  assert.equal(result.groups[0].top.length, 2)
  assert.equal(result.groups[1].options[0].pct, 100)
  assert.equal(result.groups[2].n, 0)
  assert.equal(percent(1, 3), 33.3)
  assert.equal(percent(1, 0), 0)
})

test('ordena el ranking por votos y respeta la letra original', () => {
  const slide = {
    type: 'multi',
    ranking: true,
    options: [
      { id: 'sepsis', label: 'Sepsis' },
      { id: 'isquemia', label: 'Isquemia' },
      { id: 'cad', label: 'CAD' },
    ],
  }
  const result = aggregateChoice({
    slide,
    groups,
    serviceByParticipant: new Map([['p1', 'uco']]),
    votes: [{ participantId: 'p1', value: ['cad', 'isquemia'] }],
  })
  const labels = result.groups[2].options.map((option) => option.label)
  assert.deepEqual(labels, ['Isquemia', 'CAD', 'Sepsis'])
  assert.equal(result.groups[2].options[0].letter, 'B')
  assert.equal(result.groups[2].options[1].letter, 'C')
})

test('arma la nube por grupo sin mezclar mayúsculas', () => {
  const result = aggregateWords({
    slide: { type: 'words', wordMode: 'cloud' },
    groups,
    serviceByParticipant: new Map([['p1', 'uti'], ['p2', 'uti']]),
    votes: [
      { participantId: 'p1', value: ['Oliguria', 'Fiebre'] },
      { participantId: 'p2', value: ['oliguria'] },
    ],
  })
  assert.equal(result.groups[0].n, 2)
  assert.equal(result.groups[0].words[0].text, 'Oliguria')
  assert.equal(result.groups[0].words[0].count, 2)
  assert.equal(result.groups[0].top[0].text, 'Oliguria')
})

test('calcula el costo medio del grupo y lo abre por hipótesis', () => {
  const studiesSlide = {
    id: 'estudios',
    options: [
      { id: 'gas', price: 0 },
      { id: 'ecg', price: 61000 },
      { id: 'rxt', price: 36000 },
      { id: 'tac', price: 396000 },
      { id: 'via', price: 650000 },
    ],
  }
  const hypothesisSlide = {
    options: [
      { id: 'septico', label: 'Shock séptico' },
      { id: 'cad', label: 'Cetoacidosis' },
    ],
  }
  const service = new Map([
    ['p1', 'uti'],
    ['p2', 'uti'],
    ['p3', 'clinica'],
    ['p4', 'uco'],
  ])
  const people = buildCostPeople({
    studiesSlide,
    hypothesisSlide,
    serviceByParticipant: service,
    studyVotes: [
      { participantId: 'p1', value: ['ecg', 'rxt'] },
      { participantId: 'p2', value: ['tac'] },
      { participantId: 'p3', value: ['ecg'] },
      { participantId: 'p4', value: ['gas', 'via'] },
      { participantId: 'p5', value: ['ecg'] },
    ],
    hypothesisVotes: [
      { participantId: 'p1', value: 'septico' },
      { participantId: 'p2', value: 'septico' },
      { participantId: 'p3', value: 'cad' },
    ],
  })
  const result = aggregateCost({ groups, people, hypotheses: hypothesisSlide.options })
  assert.equal(result.total, 5)
  assert.equal(result.groups[0].n, 2)
  assert.equal(result.groups[0].mean, 246500)
  assert.equal(result.groups[0].byHypothesis[0].label, 'Shock séptico')
  assert.equal(result.groups[0].byHypothesis[0].n, 2)
  assert.equal(result.groups[1].mean, 61000)
  assert.equal(result.groups[2].mean, 650000)
  assert.equal(result.groups[2].byHypothesis[0].label, 'Sin hipótesis')
  assert.equal(result.unassigned.n, 1)
  assert.equal(result.unassigned.mean, 61000)
})

test('la diapositiva de servicio solo reparte los tres grupos', () => {
  const result = summarize(
    { role: 'service', type: 'single', options: [] },
    {
      groups,
      votes: [
        { participantId: 'p1', value: 'uti' },
        { participantId: 'p2', value: 'uti' },
        { participantId: 'p3', value: 'uco' },
      ],
    },
  )
  assert.equal(result.kind, 'service')
  assert.equal(result.total, 3)
  assert.equal(result.groups[0].count, 2)
  assert.equal(result.groups[0].pct, 66.7)
})

test('la lluvia de ideas junta mayúsculas y se queda con las más repetidas', () => {
  const result = brainstormWords([
    { value: ['Oliguria', 'lactato'] },
    { value: ['oliguria'] },
    { value: ['Fiebre'] },
    { value: [] },
  ], 2)
  assert.equal(result.total, 3)
  assert.equal(result.words.length, 2)
  assert.equal(result.words[0].text, 'Oliguria')
  assert.equal(result.words[0].count, 2)
  assert.equal(result.words[1].count, 1)
})

test('fuera del caso 1 el gráfico ordena lo más votado', () => {
  const result = summarize(
    {
      id: 's-hipotesis',
      type: 'single',
      options: [
        { id: 'a', label: 'Sepsis' },
        { id: 'b', label: 'Isquemia' },
      ],
    },
    {
      bySector: false,
      votes: [
        { participantId: 'p1', value: 'b' },
        { participantId: 'p2', value: 'a' },
        { participantId: 'p3', value: 'a' },
      ],
    },
  )
  assert.equal(result.kind, 'chart')
  assert.equal(result.total, 3)
  assert.equal(result.options[0].label, 'Sepsis')
  assert.equal(result.options[0].count, 2)
  assert.equal(result.options[1].count, 1)
})

test('el caso 1 sigue agrupando por servicio', () => {
  const result = summarize(
    {
      id: 's-disnea-origen',
      type: 'single',
      options: [
        { id: 'cardiaco', label: 'Cardíaco' },
        { id: 'pulmonar', label: 'Pulmonar' },
      ],
    },
    {
      bySector: true,
      groups,
      serviceByParticipant: new Map([['p1', 'uti']]),
      votes: [{ participantId: 'p1', value: 'cardiaco' }],
    },
  )
  assert.equal(result.kind, 'choice')
  assert.equal(result.groups[0].n, 1)
  assert.equal(result.groups[0].options[0].count, 1)
})
