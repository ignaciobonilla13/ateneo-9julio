export const GROUPS = [
  { id: 'uti', label: 'UTI', color: '#e5383b' },
  { id: 'clinica', label: 'Clínica', color: '#ff8c42' },
  { id: 'uco', label: 'UCO', color: '#5ec8e3' },
]

export function groupDefs(serviceSlide) {
  return GROUPS.map((group) => ({
    id: group.id,
    label: serviceSlide?.options?.find((option) => option.id === group.id)?.label || group.label,
    color: group.color,
  }))
}

export function groupColor(id) {
  return GROUPS.find((group) => group.id === id)?.color || '#f4f6f8'
}
