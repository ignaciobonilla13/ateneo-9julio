import { letterOf, percent } from './format.js'

function mean(sum, count) {
  if (!count) return 0
  return Math.round(sum / count)
}

function topByCount(rows) {
  if (!rows.length) return []
  const max = Math.max(...rows.map((row) => row.count))
  if (max <= 0) return []
  return rows.filter((row) => row.count === max)
}

export function countAnswers(slide, votes) {
  if (!slide || !Array.isArray(votes)) return 0
  if (slide.type === 'single') {
    const ids = new Set((slide.options || []).map((option) => option.id))
    return votes.filter((vote) => typeof vote.value === 'string' && ids.has(vote.value)).length
  }
  if (slide.type === 'multi' || slide.type === 'words') {
    return votes.filter((vote) => Array.isArray(vote.value) && vote.value.length > 0).length
  }
  return 0
}

export function participantCost(studiesSlide, value) {
  if (!studiesSlide || !Array.isArray(value)) return null
  const prices = new Map((studiesSlide.options || []).map((option) => [option.id, Number(option.price) || 0]))
  return value.reduce((sum, id) => sum + (prices.get(id) || 0), 0)
}

export function aggregateChoice({ slide, votes, serviceByParticipant, groups }) {
  const buckets = new Map(groups.map((group) => [group.id, { ...group, n: 0, counts: {} }]))
  let total = 0
  let unassigned = 0
  for (const vote of votes || []) {
    const selected = slide.type === 'multi'
      ? (Array.isArray(vote.value) ? vote.value : [])
      : (typeof vote.value === 'string' && vote.value ? [vote.value] : [])
    const valid = selected.filter((id) => (slide.options || []).some((option) => option.id === id))
    if (!valid.length) continue
    total += 1
    const service = serviceByParticipant.get(vote.participantId)
    const bucket = buckets.get(service)
    if (!bucket) {
      unassigned += 1
      continue
    }
    bucket.n += 1
    for (const id of valid) bucket.counts[id] = (bucket.counts[id] || 0) + 1
  }

  return {
    kind: 'choice',
    ranking: !!slide.ranking,
    total,
    unassigned,
    groups: groups.map((group) => {
      const bucket = buckets.get(group.id)
      let options = (slide.options || []).map((option, index) => ({
        id: option.id,
        label: option.label,
        letter: letterOf(index),
        price: option.price ?? null,
        note: option.note || '',
        count: bucket.counts[option.id] || 0,
        pct: percent(bucket.counts[option.id] || 0, bucket.n),
      }))
      if (slide.ranking) {
        options = [...options].sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter))
      }
      const leaders = topByCount(options)
      return {
        id: group.id,
        label: group.label,
        n: bucket.n,
        top: leaders.map((row) => ({ id: row.id, label: row.label, letter: row.letter })),
        options,
      }
    }),
  }
}

export function aggregateWords({ slide, votes, serviceByParticipant, groups }) {
  const buckets = new Map(groups.map((group) => [group.id, { n: 0, words: new Map() }]))
  let total = 0
  let unassigned = 0
  for (const vote of votes || []) {
    const words = Array.isArray(vote.value) ? vote.value : []
    if (!words.length) continue
    total += 1
    const bucket = buckets.get(serviceByParticipant.get(vote.participantId))
    if (!bucket) {
      unassigned += 1
      continue
    }
    bucket.n += 1
    for (const word of words) {
      const key = String(word).toLocaleLowerCase('es')
      const current = bucket.words.get(key) || { text: word, count: 0 }
      current.count += 1
      if (current.count === 1) current.text = word
      bucket.words.set(key, current)
    }
  }

  return {
    kind: 'words',
    mode: slide.wordMode === 'list' ? 'list' : 'cloud',
    total,
    unassigned,
    groups: groups.map((group) => {
      const bucket = buckets.get(group.id)
      const words = [...bucket.words.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, 'es'))
      const max = words[0]?.count || 0
      return {
        id: group.id,
        label: group.label,
        n: bucket.n,
        top: max > 0 ? words.filter((word) => word.count === max).map((word) => ({ text: word.text })) : [],
        words,
      }
    }),
  }
}

export function aggregateService({ votes, groups }) {
  const counts = Object.fromEntries(groups.map((group) => [group.id, 0]))
  let total = 0
  for (const vote of votes || []) {
    if (typeof vote.value !== 'string' || counts[vote.value] == null) continue
    counts[vote.value] += 1
    total += 1
  }
  return {
    kind: 'service',
    total,
    unassigned: 0,
    groups: groups.map((group) => ({
      id: group.id,
      label: group.label,
      count: counts[group.id],
      pct: percent(counts[group.id], total),
    })),
  }
}

export function buildCostPeople({ studiesSlide, studyVotes, hypothesisVotes, serviceByParticipant }) {
  const prices = new Map((studiesSlide?.options || []).map((option) => [option.id, Number(option.price) || 0]))
  const hypothesisByPerson = new Map(
    (hypothesisVotes || [])
      .filter((vote) => typeof vote.value === 'string' && vote.value)
      .map((vote) => [vote.participantId, vote.value]),
  )
  const people = []
  for (const vote of studyVotes || []) {
    const ids = Array.isArray(vote.value) ? vote.value.filter((id) => prices.has(id)) : []
    if (!ids.length) continue
    people.push({
      participantId: vote.participantId,
      service: serviceByParticipant.get(vote.participantId) || null,
      hypothesis: hypothesisByPerson.get(vote.participantId) || null,
      cost: ids.reduce((sum, id) => sum + (prices.get(id) || 0), 0),
    })
  }
  return people
}

export function aggregateCost({ groups, people, hypotheses }) {
  const buckets = new Map(groups.map((group) => [group.id, { n: 0, sum: 0, byHypothesis: new Map() }]))
  const unassigned = { n: 0, sum: 0 }
  for (const person of people || []) {
    const bucket = buckets.get(person.service)
    if (!bucket) {
      unassigned.n += 1
      unassigned.sum += person.cost
      continue
    }
    bucket.n += 1
    bucket.sum += person.cost
    const key = person.hypothesis || '__none__'
    const row = bucket.byHypothesis.get(key) || { n: 0, sum: 0 }
    row.n += 1
    row.sum += person.cost
    bucket.byHypothesis.set(key, row)
  }

  return {
    kind: 'cost',
    total: (people || []).length,
    unassigned: { n: unassigned.n, mean: mean(unassigned.sum, unassigned.n) },
    groups: groups.map((group) => {
      const bucket = buckets.get(group.id)
      const rows = []
      for (const hypothesis of hypotheses || []) {
        const row = bucket.byHypothesis.get(hypothesis.id)
        if (!row) continue
        rows.push({ id: hypothesis.id, label: hypothesis.label, n: row.n, mean: mean(row.sum, row.n) })
      }
      const missing = bucket.byHypothesis.get('__none__')
      if (missing) rows.push({ id: '__none__', label: 'Sin hipótesis', n: missing.n, mean: mean(missing.sum, missing.n) })
      for (const [key, row] of bucket.byHypothesis) {
        if (key === '__none__' || (hypotheses || []).some((hypothesis) => hypothesis.id === key)) continue
        rows.push({ id: key, label: 'Hipótesis anterior', n: row.n, mean: mean(row.sum, row.n) })
      }
      return {
        id: group.id,
        label: group.label,
        n: bucket.n,
        mean: mean(bucket.sum, bucket.n),
        byHypothesis: rows,
      }
    }),
  }
}

export function summarize(slide, context) {
  if (!slide) return null
  if (slide.role === 'service') {
    return aggregateService({ votes: context.votes, groups: context.groups })
  }
  if (slide.type === 'cost' || slide.role === 'cost') {
    const people = buildCostPeople({
      studiesSlide: context.studiesSlide,
      studyVotes: context.studyVotes,
      hypothesisVotes: context.hypothesisVotes,
      serviceByParticipant: context.serviceByParticipant,
    })
    return aggregateCost({
      groups: context.groups,
      people,
      hypotheses: (context.hypothesisSlide?.options || []).map((option) => ({ id: option.id, label: option.label })),
    })
  }
  if (slide.type === 'words') {
    return aggregateWords({
      slide,
      votes: context.votes,
      serviceByParticipant: context.serviceByParticipant,
      groups: context.groups,
    })
  }
  if (slide.type === 'single' || slide.type === 'multi') {
    return aggregateChoice({
      slide,
      votes: context.votes,
      serviceByParticipant: context.serviceByParticipant,
      groups: context.groups,
    })
  }
  return null
}
