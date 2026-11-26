import { DEFAULT_DESIGN, FONT_OPTIONS } from '@shared/design.js'
import { GROUPS } from '@shared/groups.js'
import { letterOf, money, percent } from '@shared/format.js'
import { newId, parseOptionLines, serializeCards } from '@shared/text.js'
import { useEffect, useRef, useState } from 'react'
import { LoadingScreen, Modal } from '../components/Chrome.jsx'
import { SlideView } from '../components/SlideView.jsx'
import { ThemeScope } from '../components/ThemeScope.jsx'
import { loadToken } from '../lib/identity.js'
import { usePresenter } from '../realtime/PresenterContext.jsx'

const TYPES = [
  { id: 'text', label: 'Texto' },
  { id: 'single', label: 'Opción única' },
  { id: 'multi', label: 'Opción múltiple' },
  { id: 'words', label: 'Palabras' },
  { id: 'cost', label: 'Análisis de costo' },
]

const VARIANTS = [
  { id: 'plain', label: 'Simple' },
  { id: 'case', label: 'Caso' },
  { id: 'labs', label: 'Laboratorio' },
  { id: 'reveal', label: 'Revelación' },
  { id: 'criteria', label: 'Criterios' },
  { id: 'evolution', label: 'Evolución' },
  { id: 'takeaways', label: 'Mensajes' },
]

const TYPE_LABEL = Object.fromEntries(TYPES.map((type) => [type.id, type.label]))

function blankSlide(type) {
  const slide = {
    id: newId(),
    type,
    role: null,
    locked: false,
    variant: 'plain',
    kicker: '',
    title: 'Nueva diapositiva',
    subtitle: '',
    body: [],
    cards: [],
    question: '',
    options: [],
    maxSelect: null,
    maxWords: 5,
    wordMode: 'cloud',
    ranking: false,
    footnote: '',
  }
  if (type === 'single' || type === 'multi') {
    slide.question = 'Nueva pregunta'
    slide.options = [
      { id: newId(), label: 'Opción A', price: null, note: '' },
      { id: newId(), label: 'Opción B', price: null, note: '' },
    ]
  }
  if (type === 'words') slide.question = 'Nueva pregunta abierta'
  if (type === 'cost') {
    slide.role = 'cost'
    slide.locked = true
    slide.title = 'Análisis de costo'
  }
  return slide
}

function sampleResults(slide) {
  if (!slide) return null
  if (slide.role === 'service') {
    const counts = [8, 5, 3]
    const total = counts.reduce((sum, count) => sum + count, 0)
    return {
      kind: 'service',
      total,
      groups: (slide.options || []).map((option, index) => ({
        id: option.id,
        label: option.label,
        count: counts[index] || 0,
        pct: percent(counts[index] || 0, total),
      })),
    }
  }
  if ((slide.type === 'single' || slide.type === 'multi') && slide.options?.length) {
    return {
      kind: 'choice',
      ranking: !!slide.ranking,
      total: 12,
      unassigned: 1,
      groups: GROUPS.map((group, groupIndex) => {
        const n = 4
        let options = slide.options.map((option, index) => {
          const count = Math.max(0, [6, 4, 2, 1, 1][index] - groupIndex || 0)
          return {
            id: option.id,
            label: option.label,
            letter: letterOf(index),
            price: option.price ?? null,
            note: option.note || '',
            count,
            pct: percent(count, n),
          }
        })
        if (slide.ranking) options = [...options].sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter))
        const max = Math.max(...options.map((option) => option.count))
        return {
          id: group.id,
          label: group.label,
          n,
          top: options.filter((option) => option.count === max && max > 0).map((option) => ({ id: option.id, label: option.label, letter: option.letter })),
          options,
        }
      }),
    }
  }
  if (slide.type === 'words') {
    const samples = ['dato uno', 'dato dos', 'dato tres', 'dato cuatro']
    return {
      kind: 'words',
      mode: slide.wordMode === 'list' ? 'list' : 'cloud',
      total: 8,
      unassigned: 0,
      groups: GROUPS.map((group, groupIndex) => ({
        id: group.id,
        label: group.label,
        n: 3,
        top: [{ text: samples[0] }],
        words: samples.map((text, index) => ({ text, count: Math.max(1, 4 - index - groupIndex) })),
      })),
    }
  }
  if (slide.type === 'cost') {
    return {
      kind: 'cost',
      total: 12,
      unassigned: { n: 0, mean: 0 },
      groups: GROUPS.map((group, index) => ({
        id: group.id,
        label: group.label,
        n: 4,
        mean: 180000 + index * 70000,
        byHypothesis: [
          { id: 'a', label: 'Hipótesis A', n: 2, mean: 150000 + index * 20000 },
          { id: 'b', label: 'Hipótesis B', n: 2, mean: 260000 },
        ],
      })),
    }
  }
  return null
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

function OptionEditor({ slide, onChange }) {
  const priced = slide.role === 'studies'
  const [paste, setPaste] = useState('')
  const [pasteError, setPasteError] = useState('')
  const options = slide.options || []

  function setOptions(next) {
    onChange({ options: next })
  }

  function edit(index, patch) {
    setOptions(options.map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option))
  }

  function move(index, direction) {
    const target = index + direction
    if (target < 0 || target >= options.length) return
    const next = [...options]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setOptions(next)
  }

  function applyPaste() {
    const parsed = parseOptionLines(paste, { priced })
    if (parsed.errors.length) {
      setPasteError(parsed.errors[0])
      return
    }
    if (parsed.options.length < 2) {
      setPasteError('Hacen falta al menos dos opciones')
      return
    }
    const pool = [...options]
    setOptions(parsed.options.map((option) => {
      const index = pool.findIndex((item) => item.label === option.label)
      if (index >= 0) {
        const [kept] = pool.splice(index, 1)
        return { ...option, id: kept.id, price: priced ? option.price : null }
      }
      return { ...option, id: newId(), price: priced ? option.price : null }
    }))
    setPaste('')
    setPasteError('')
  }

  if (slide.role === 'service') {
    return (
      <div className="grid gap-3">
        {options.map((option, index) => (
          <Field key={option.id} label={option.id === 'uti' ? 'Nombre de UTI' : option.id === 'uco' ? 'Nombre de UCO' : 'Nombre de Clínica'}>
            <input className="field" value={option.label} onChange={(event) => edit(index, { label: event.target.value })} />
          </Field>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        {priced ? 'Formato: estudio | precio | nota opcional.' : 'Una opción por línea si pegás un listado.'}
      </p>
      {options.map((option, index) => (
        <div key={option.id} className="grid gap-2 rounded-2xl border p-3" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-center gap-2">
            <span className="w-8 font-bold">{letterOf(index)}</span>
            <input className="field" value={option.label} onChange={(event) => edit(index, { label: event.target.value })} />
          </div>
          {priced && (
            <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
              <input className="field" inputMode="numeric" value={option.price ?? 0} onChange={(event) => edit(index, { price: Number(event.target.value.replace(/[^\d]/g, '') || 0) })} />
              <input className="field" placeholder="Nota opcional" value={option.note || ''} onChange={(event) => edit(index, { note: event.target.value })} />
              <span className="self-center text-sm tabular-nums" style={{ color: 'var(--muted)' }}>{money(option.price || 0)}</span>
            </div>
          )}
          <div className="flex gap-2 text-sm">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0}>Subir</button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === options.length - 1}>Bajar</button>
            <button type="button" onClick={() => setOptions(options.filter((_, optionIndex) => optionIndex !== index))} disabled={options.length <= 2}>Quitar</button>
          </div>
        </div>
      ))}
      <button type="button" className="rounded-2xl border px-3 py-2 text-left" style={{ borderColor: 'var(--line)' }} onClick={() => setOptions([...options, { id: newId(), label: 'Nueva opción', price: priced ? 0 : null, note: '' }])}>
        Agregar opción
      </button>
      <Field label={priced ? 'Pegar listado (estudio | precio | nota opcional)' : 'Pegar listado (una opción por línea)'}>
        <textarea className="field min-h-24" value={paste} onChange={(event) => setPaste(event.target.value)} />
      </Field>
      {pasteError && <p className="text-sm" style={{ color: 'var(--accent)' }}>{pasteError}</p>}
      <button type="button" className="rounded-full px-4 py-2 font-semibold" style={{ background: 'var(--card)' }} onClick={applyPaste}>Reemplazar con el listado</button>
    </div>
  )
}

export default function EditorPage({ onProject }) {
  const { state, status, actions } = usePresenter()
  const [draft, setDraft] = useState(null)
  const [selected, setSelected] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [sample, setSample] = useState(false)
  const [epoch, setEpoch] = useState(0)
  const [pending, setPending] = useState(null)
  const [addType, setAddType] = useState('text')
  const applied = useRef(null)

  useEffect(() => {
    if (!state?.slides) return
    if (dirty) {
      if (applied.current != null && state.contentVersion !== applied.current) {
        setNotice('Hay cambios publicados desde otra pantalla.')
      }
      return
    }
    if (applied.current != null && state.contentVersion <= applied.current) return
    setDraft({ slides: state.slides, design: state.design, priceTable: state.priceTable })
    applied.current = state.contentVersion
  }, [state, dirty])

  if (!draft) {
    return <LoadingScreen label={status === 'offline' ? 'No hay conexión con la sala' : 'Abriendo el editor…'} action={status === 'offline' ? () => window.location.reload() : null} />
  }

  const slide = draft.slides[Math.min(selected, draft.slides.length - 1)]
  const hasCost = draft.slides.some((item) => item.role === 'cost')

  function patchSlide(patch) {
    setDirty(true)
    setNotice('')
    setDraft((current) => ({
      ...current,
      slides: current.slides.map((item) => item.id === slide.id ? { ...item, ...patch } : item),
    }))
  }

  function patchDesign(patch) {
    setDirty(true)
    setNotice('')
    setDraft((current) => ({ ...current, design: { ...current.design, ...patch } }))
  }

  function moveSlide(index, direction) {
    const target = index + direction
    if (target < 0 || target >= draft.slides.length) return
    const slides = [...draft.slides]
    const [item] = slides.splice(index, 1)
    slides.splice(target, 0, item)
    setDraft({ ...draft, slides })
    setSelected(target)
    setDirty(true)
  }

  function addSlide() {
    if (addType === 'cost' && hasCost) return
    const created = blankSlide(addType)
    setDraft({ ...draft, slides: [...draft.slides, created] })
    setSelected(draft.slides.length)
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    setError('')
    const response = await actions.save(draft)
    setSaving(false)
    if (!response.ok) {
      setError(response.error || 'No se pudo publicar')
      return
    }
    applied.current = response.contentVersion
    setDraft({ slides: response.slides, design: response.design, priceTable: response.priceTable })
    setDirty(false)
    setEpoch((value) => value + 1)
    setNotice('Publicado en todas las pantallas')
  }

  async function restore() {
    const response = await actions.restore()
    setPending(null)
    if (!response.ok) {
      setError(response.error || 'No se pudo restaurar')
      return
    }
    applied.current = response.contentVersion
    setDraft({ slides: response.slides, design: response.design, priceTable: response.priceTable })
    setSelected(0)
    setDirty(false)
    setEpoch((value) => value + 1)
    setNotice('Volvimos al contenido original')
  }

  async function exportCsv() {
    const response = await fetch('/api/export.csv', { headers: { Authorization: `Bearer ${loadToken()}` } })
    if (!response.ok) {
      setError('No se pudo exportar')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ateneo-resultados.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-dvh" style={{ background: '#0e1116', color: '#f4f6f8' }}>
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b px-4 py-3" style={{ background: '#0e1116', borderColor: 'var(--line)' }}>
        <div className="mr-auto">
          <p className="kicker">Editor</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{dirty ? 'Cambios sin guardar' : notice || 'En vivo con la sala'}</p>
        </div>
        <button type="button" className="rounded-full px-3 py-2 text-sm font-semibold" style={{ background: '#171c24' }} onClick={onProject}>Volver a proyectar</button>
        <button type="button" className="rounded-full px-3 py-2 text-sm font-semibold" onClick={exportCsv}>Exportar CSV</button>
        <button type="button" className="rounded-full px-3 py-2 text-sm font-semibold" onClick={() => setPending({ type: 'restore' })}>Restaurar contenido</button>
        <button type="button" className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: '#e5383b' }} disabled={saving} onClick={save}>
          {saving ? 'Publicando…' : 'Guardar y publicar'}
        </button>
      </header>
      {error && <p className="px-4 pt-3 text-sm" style={{ color: '#e5383b' }} role="alert">{error}</p>}
      <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)_340px]">
        <aside className="border-b p-4 lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--line)' }}>
          <label className="mb-3 block lg:hidden">
            <span className="field-label">Diapositiva</span>
            <select className="field" value={selected} onChange={(event) => setSelected(Number(event.target.value))}>
              {draft.slides.map((item, index) => <option key={item.id} value={index}>{index + 1}. {item.title || item.question || 'Sin título'}</option>)}
            </select>
          </label>
          <ol className="hidden max-h-[70vh] gap-1 overflow-auto lg:grid">
            {draft.slides.map((item, index) => (
              <li key={item.id}>
                <button type="button" className="w-full rounded-xl px-3 py-2 text-left" style={{ background: index === selected ? '#171c24' : 'transparent' }} onClick={() => setSelected(index)}>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{String(index + 1).padStart(2, '0')} · {TYPE_LABEL[item.type] || item.type}{item.locked ? ' · base' : ''}</span>
                  <span className="block truncate">{item.title || item.question || 'Sin título'}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex gap-2">
            <select className="field" value={addType} onChange={(event) => setAddType(event.target.value)}>
              {TYPES.filter((type) => type.id !== 'cost' || !hasCost).map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
            </select>
            <button type="button" className="rounded-2xl px-3 font-semibold" style={{ background: '#171c24' }} onClick={addSlide}>Agregar</button>
          </div>
        </aside>
        <main className="grid gap-4 p-4" key={`${slide.id}-${epoch}`}>
          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" onClick={() => moveSlide(selected, -1)} disabled={selected === 0}>Subir</button>
            <button type="button" onClick={() => moveSlide(selected, 1)} disabled={selected === draft.slides.length - 1}>Bajar</button>
            <button type="button" disabled={slide.locked} title={slide.locked ? 'Esta diapositiva no se puede borrar: es parte del análisis.' : 'Eliminar'} onClick={() => setPending({ type: 'delete' })}>
              Eliminar
            </button>
          </div>
          <Field label="Antetítulo"><input className="field" value={slide.kicker || ''} onChange={(event) => patchSlide({ kicker: event.target.value })} /></Field>
          <Field label="Título"><input className="field" value={slide.title || ''} onChange={(event) => patchSlide({ title: event.target.value })} /></Field>
          <Field label="Subtítulo"><input className="field" value={slide.subtitle || ''} onChange={(event) => patchSlide({ subtitle: event.target.value })} /></Field>
          {slide.type === 'text' && (
            <Field label="Variante">
              <select className="field" value={slide.variant || 'plain'} onChange={(event) => patchSlide({ variant: event.target.value })}>
                {VARIANTS.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
              </select>
            </Field>
          )}
          <Field label="Texto (un párrafo por línea)">
            <textarea className="field min-h-28" value={(slide.body || []).join('\n')} onChange={(event) => patchSlide({ body: event.target.value.split('\n') })} />
          </Field>
          {slide.type !== 'words' && slide.type !== 'cost' && (
            <Field label="Tarjetas (etiqueta | valor)">
              <textarea className="field min-h-24" defaultValue={serializeCards(slide.cards)} onChange={(event) => patchSlide({ cards: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => { const [label, ...rest] = line.split('|'); return { label: (label || '').trim(), value: rest.join('|').trim() } }).filter((card) => card.label && card.value) })} />
            </Field>
          )}
          {(slide.type === 'single' || slide.type === 'multi' || slide.type === 'words') && (
            <Field label="Pregunta"><textarea className="field min-h-20" value={slide.question || ''} onChange={(event) => patchSlide({ question: event.target.value })} /></Field>
          )}
          {slide.type === 'words' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Presentación">
                <select className="field" value={slide.wordMode || 'cloud'} onChange={(event) => patchSlide({ wordMode: event.target.value })}>
                  <option value="cloud">Nube de palabras</option>
                  <option value="list">Lista</option>
                </select>
              </Field>
              <Field label="Máximo por persona">
                <input className="field" inputMode="numeric" value={slide.maxWords || 5} onChange={(event) => patchSlide({ maxWords: Math.min(5, Math.max(1, Number(event.target.value.replace(/[^\d]/g, '') || 1))) })} />
              </Field>
            </div>
          )}
          {slide.type === 'multi' && slide.role !== 'service' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Máximo de selecciones">
                <input className="field" inputMode="numeric" placeholder="Sin límite" value={slide.maxSelect ?? ''} onChange={(event) => { const raw = event.target.value.replace(/[^\d]/g, ''); patchSlide({ maxSelect: raw ? Number(raw) : null }) }} />
              </Field>
              <label className="mt-6 flex items-center gap-2">
                <input type="checkbox" checked={!!slide.ranking} onChange={(event) => patchSlide({ ranking: event.target.checked })} />
                Armar ranking por votos
              </label>
            </div>
          )}
          {(slide.type === 'single' || slide.type === 'multi') && <OptionEditor slide={slide} onChange={patchSlide} />}
          {(slide.type === 'cost' || slide.role === 'cost') && (
            <>
              <Field label="Aclaración al pie"><textarea className="field min-h-24" value={slide.footnote || ''} onChange={(event) => patchSlide({ footnote: event.target.value })} /></Field>
              <div className="grid gap-3">
                <p className="field-label">Tabla de referencia</p>
                {draft.priceTable.map((row, index) => (
                  <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                    <input className="field" value={row.label} onChange={(event) => {
                      const priceTable = draft.priceTable.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item)
                      setDirty(true)
                      setDraft({ ...draft, priceTable })
                    }} />
                    <input className="field" inputMode="numeric" value={row.price} onChange={(event) => {
                      const priceTable = draft.priceTable.map((item, itemIndex) => itemIndex === index ? { ...item, price: Number(event.target.value.replace(/[^\d]/g, '') || 0) } : item)
                      setDirty(true)
                      setDraft({ ...draft, priceTable })
                    }} />
                    <button type="button" onClick={() => { setDirty(true); setDraft({ ...draft, priceTable: draft.priceTable.filter((_, itemIndex) => itemIndex !== index) }) }}>Quitar</button>
                  </div>
                ))}
                <button type="button" className="rounded-2xl border px-3 py-2 text-left" style={{ borderColor: 'var(--line)' }} onClick={() => { setDirty(true); setDraft({ ...draft, priceTable: [...draft.priceTable, { id: newId(), label: 'Nuevo ítem', price: 0 }] }) }}>
                  Agregar fila
                </button>
              </div>
            </>
          )}
        </main>
        <aside className="grid content-start gap-4 border-t p-4 lg:border-l lg:border-t-0" style={{ borderColor: 'var(--line)' }}>
          <div>
            <p className="field-label">Diseño</p>
            {[
              ['accent1', 'Acento 1'],
              ['accent2', 'Acento 2'],
              ['background', 'Fondo'],
              ['card', 'Tarjetas'],
              ['text', 'Texto'],
            ].map(([key, label]) => (
              <label key={key} className="mt-3 flex items-center justify-between gap-3">
                <span>{label}</span>
                <input type="color" value={draft.design[key]} onChange={(event) => patchDesign({ [key]: event.target.value })} />
              </label>
            ))}
            <Field label={`Tamaño del texto (${draft.design.fontScale}%)`}>
              <input className="mt-2 w-full" type="range" min="80" max="170" value={draft.design.fontScale} onChange={(event) => patchDesign({ fontScale: Number(event.target.value) })} />
            </Field>
            <Field label="Tipografía">
              <select className="field mt-2" value={draft.design.font} onChange={(event) => patchDesign({ font: event.target.value })}>
                {FONT_OPTIONS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
              </select>
            </Field>
            <button type="button" className="mt-4 rounded-full px-3 py-2 text-sm font-semibold" style={{ background: '#171c24' }} onClick={() => patchDesign({ accent1: DEFAULT_DESIGN.accent1, accent2: DEFAULT_DESIGN.accent2, background: DEFAULT_DESIGN.background, card: DEFAULT_DESIGN.card, text: DEFAULT_DESIGN.text })}>
              Volver a los colores originales
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sample} onChange={(event) => setSample(event.target.checked)} />
            Ver resultados de ejemplo
          </label>
          <div className="h-[560px] overflow-auto rounded-3xl border" style={{ borderColor: 'var(--line)', background: draft.design.background }}>
            <ThemeScope design={draft.design}>
              <div className="relative min-h-[560px]">
                <SlideView
                  mode="preview"
                  slide={slide}
                  slideIndex={draft.slides.findIndex((item) => item.id === slide.id)}
                  slideCount={draft.slides.length}
                  results={sample ? sampleResults(slide) : (slide.type === 'cost' ? sampleResults(slide) : null)}
                  priceTable={draft.priceTable}
                  publicUrl={typeof window !== 'undefined' ? window.location.origin : ''}
                />
              </div>
            </ThemeScope>
          </div>
        </aside>
      </div>
      {pending?.type === 'delete' && (
        <Modal title="¿Eliminar esta diapositiva?" body="Los votos de esa pregunta dejan de verse. Las diapositivas base del análisis no se pueden borrar." confirmLabel="Eliminar" danger onClose={() => setPending(null)} onConfirm={() => {
          const index = draft.slides.findIndex((item) => item.id === slide.id)
          setDraft({ ...draft, slides: draft.slides.filter((item) => item.id !== slide.id) })
          setSelected(Math.max(0, index - 1))
          setDirty(true)
          setPending(null)
        }} />
      )}
      {pending?.type === 'restore' && (
        <Modal title="¿Restaurar el contenido original?" body="Se vuelven a publicar las 17 diapositivas y la tabla de precios. El diseño de colores se conserva. Los votos no se borran." confirmLabel="Restaurar" danger onClose={() => setPending(null)} onConfirm={restore} />
      )}
    </div>
  )
}
