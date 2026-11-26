import { participantCost } from '../shared/aggregate.js'
import { groupDefs } from '../shared/groups.js'

function cell(value) {
  let text = String(value ?? '')
  if (/^[=+\-@\t]/.test(text)) text = `'${text}`
  if (/[;"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function answerLabel(slide, value) {
  if (slide?.type === 'words' && Array.isArray(value)) return value.join(' | ')
  const ids = Array.isArray(value) ? value : [value]
  return ids
    .filter(Boolean)
    .map((id) => slide?.options?.find((option) => option.id === id)?.label || id)
    .join(' | ')
}

export function buildCsv({ slides, priceTable, participants, votes }) {
  const serviceSlide = slides.find((slide) => slide.role === 'service')
  const studiesSlide = slides.find((slide) => slide.role === 'studies')
  const labels = new Map(groupDefs(serviceSlide).map((group) => [group.id, group.label]))
  const order = new Map(slides.map((slide, index) => [slide.id, index]))
  const people = new Map(participants.map((person) => [person.id, person]))
  const costByPerson = new Map()
  for (const vote of votes) {
    if (vote.slideId === studiesSlide?.id) {
      const cost = participantCost(studiesSlide, vote.value)
      if (cost != null) costByPerson.set(vote.participantId, cost)
    }
  }
  const rows = [...votes]
    .filter((vote) => order.has(vote.slideId))
    .sort((a, b) => a.participantId.localeCompare(b.participantId) || order.get(a.slideId) - order.get(b.slideId))
    .map((vote) => {
      const slide = slides[order.get(vote.slideId)]
      const person = people.get(vote.participantId)
      return [
        vote.participantId,
        labels.get(person?.service) || 'Sin servicio',
        order.get(vote.slideId) + 1,
        slide.question || slide.title,
        answerLabel(slide, vote.value),
        costByPerson.get(vote.participantId) ?? '',
      ]
    })
  const header = ['participante', 'servicio', 'diapositiva', 'pregunta', 'respuesta', 'costo']
  const reference = (priceTable || []).map((row) => ['referencia', '', '', row.label, '', row.price])
  const lines = [header, ...rows, ...reference].map((row) => row.map(cell).join(';'))
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
