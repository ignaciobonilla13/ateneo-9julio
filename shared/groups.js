export const GROUPS = [
  { id: 'clinica', label: 'Clínica Médica', color: '#ff8c42' },
  { id: 'uti', label: 'UTI', color: '#e5383b' },
  { id: 'uco', label: 'UCO', color: '#5ec8e3' },
  { id: 'otros', label: 'Otros', color: '#7c5cbf' },
]

export function groupDefs(serviceSlide) {
  return GROUPS.map((group) => ({
    id: group.id,
    label: serviceSlide?.options?.find((option) => option.id === group.id)?.label || group.label,
    color: group.color,
  }))
}

export function groupColor(id) {
  if (id === 'sala') return '#0e8a78'
  return GROUPS.find((group) => group.id === id)?.color || '#f4f6f8'
}
