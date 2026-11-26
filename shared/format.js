export function letterOf(index) {
  return index >= 0 && index < 26 ? String.fromCharCode(65 + index) : String(index + 1)
}

export function money(value) {
  const n = Math.round(Number(value) || 0)
  const body = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${n < 0 ? '-' : ''}$${body}`
}

export function formatPct(value) {
  const n = Number(value) || 0
  const rounded = Math.round(n * 10) / 10
  const [whole, frac] = rounded.toFixed(1).split('.')
  if (frac === '0') return `${whole}%`
  return `${whole},${frac}%`
}

export function percent(count, total) {
  if (!total) return 0
  return Math.round((count / total) * 1000) / 10
}
