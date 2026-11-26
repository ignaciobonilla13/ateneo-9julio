const WORD_MAX = 40

export function cleanLine(value, max) {
  let text = String(value ?? '')
  text = text.replace(/<[^>]*>/g, '')
  text = text.replace(/[<>]/g, '')
  text = text.replace(/[\u0000-\u001F\u007F]/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()
  if (text.length > max) text = text.slice(0, max).trim()
  return text
}

export function parsePrice(raw) {
  if (raw == null || raw === '') return 0
  let text = String(raw).trim().replace(/\$/g, '').replace(/\s/g, '')
  if (!text) return 0
  if (text.includes(',') && text.includes('.')) {
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
      text = text.replace(/\./g, '').replace(',', '.')
    } else {
      text = text.replace(/,/g, '')
    }
  } else if (text.includes(',')) {
    const parts = text.split(',')
    if (parts.length === 2 && parts[1].length <= 2) text = `${parts[0].replace(/\./g, '')}.${parts[1]}`
    else text = text.replace(/,/g, '')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '')
  }
  const value = Number(text)
  if (!Number.isFinite(value) || value < 0 || value > 100000000) {
    throw new Error('Precio inválido')
  }
  return Math.round(value)
}

export function sanitizeWord(input) {
  let text = String(input ?? '').normalize('NFKC')
  text = text.replace(/<[^>]*>/g, '')
  text = text.replace(/[<>]/g, '')
  text = text.replace(/[\u0000-\u001F\u007F]/g, '')
  text = text.replace(/\s+/g, ' ').trim()
  if (text.length > WORD_MAX) text = text.slice(0, WORD_MAX).trim()
  if (!text || !/[\p{L}\p{N}]/u.test(text)) return ''
  return text
}

export function sanitizeWords(list, max = 5) {
  const limit = Math.min(5, Math.max(1, Number(max) || 5))
  const words = []
  const seen = new Set()
  const source = Array.isArray(list) ? list : []
  for (const item of source) {
    const word = sanitizeWord(item)
    if (!word) continue
    const key = word.toLocaleLowerCase('es')
    if (seen.has(key)) continue
    seen.add(key)
    words.push(word)
    if (words.length >= limit) break
  }
  return words
}

export function parseOptionLines(text, { priced = false } = {}) {
  const options = []
  const errors = []
  const lines = String(text ?? '').split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (!line) continue
    if (!priced) {
      options.push({ label: line, price: null, note: '' })
      continue
    }
    const parts = line.split('|').map((part) => part.trim())
    if (!parts[0]) {
      errors.push(`Línea ${index + 1}: falta el estudio`)
      continue
    }
    let price = 0
    if (parts[1]) {
      try {
        price = parsePrice(parts[1])
      } catch {
        errors.push(`Línea ${index + 1}: precio inválido`)
        continue
      }
    }
    options.push({ label: parts[0], price, note: parts[2] || '' })
  }
  return { options, errors }
}

export function serializeOptions(options, { priced = false } = {}) {
  return (options || [])
    .map((option) => {
      if (!priced) return option.label
      const note = option.note ? ` | ${option.note}` : ''
      return `${option.label} | ${option.price ?? 0}${note}`
    })
    .join('\n')
}

export function parseCards(text) {
  return String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split('|')
      return { label: label.trim(), value: rest.join('|').trim() }
    })
    .filter((card) => card.label && card.value)
}

export function serializeCards(cards) {
  return (cards || []).map((card) => `${card.label} | ${card.value}`).join('\n')
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SLUG = /^[a-zA-Z0-9_-]{1,80}$/

export function isSafeId(id) {
  return typeof id === 'string' && (UUID.test(id) || SLUG.test(id))
}

export function newId() {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
