import { DEFAULT_DESIGN, FONT_OPTIONS } from '@shared/design.js'
import { GROUPS } from '@shared/groups.js'
import { letterOf, money, percent } from '@shared/format.js'
import { newId, parseOptionLines } from '@shared/text.js'
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
  { id: 'takeaways', label: 'Mensajes numerados' },
  { id: 'panels', label: 'Recuadros con viñetas' },
  { id: 'bars', label: 'Barras' },
  { id: 'spotlight', label: 'Pantalla oscura' },
]

const TYPE_LABEL = Object.fromEntries(TYPES.map((type) => [type.id, type.label]))

const SKINS = [
  { id: 'claro', label: 'Claro' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'oscuro', label: 'Oscuro' },
  { id: 'centrado', label: 'Centrado' },
  { id: 'franja', label: 'Franja' },
]

function SkinPicker({ value, onChange }) {
  return (
    <div className="skin-picker">
      {SKINS.map((skin) => (
        <button key={skin.id} type="button" className="skin-choice" data-on={value === skin.id ? 'true' : 'false'} onClick={() => onChange(skin.id)}>
          <span className="skin-swatch" data-skin={skin.id} />
          {skin.label}
        </button>
      ))}
    </div>
  )
}

function slideName(item) {
  return (item.title || item.question || 'Sin título').replace(/\*/g, '')
}

function blankSlide(type) {
  const slide = {
    id: newId(),
    type,
    role: null,
    locked: false,
    variant: 'plain',
    skin: 'claro',
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

const SAMPLE_CLOUD = {
  total: 18,
  words: [
    { text: 'oliguria', count: 11 },
    { text: 'lactato', count: 8 },
    { text: 'metformina', count: 6 },
    { text: 'taquicardia', count: 4 },
    { text: 'hipotensión', count: 3 },
    { text: 'fiebre', count: 2 },
    { text: 'diuresis', count: 2 },
    { text: 'fármacos', count: 1 },
  ],
}

function sampleResults(slide) {
  if (!slide) return null
  if (slide.role === 'service') {
    const counts = [8, 5, 3, 2]
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
  const sector = slide.role === 'service' || String(slide.id || '').startsWith('s-disnea-')
  if (!sector && slide.type === 'words') {
    return {
      kind: 'chart',
      mode: 'words',
      total: 18,
      words: [
        { text: 'oliguria', count: 11 },
        { text: 'lactato', count: 8 },
        { text: 'metformina', count: 4 },
      ],
    }
  }
  if (!sector && (slide.type === 'cost' || slide.role === 'cost')) {
    return {
      kind: 'chart',
      mode: 'cost',
      total: 18,
      mean: 246000,
      studies: [
        { id: 'gas', letter: 'A', label: 'Gasometría + lactato', count: 16, pct: 89 },
        { id: 'ecg', letter: 'B', label: 'ECG', count: 12, pct: 67 },
        { id: 'tac', letter: 'C', label: 'TAC abdomen', count: 5, pct: 28 },
      ],
      hypotheses: [
        { id: 'a', label: 'Shock séptico', n: 10, mean: 310000 },
        { id: 'b', label: 'Otra causa metabólica', n: 8, mean: 180000 },
      ],
    }
  }
  if (!sector && (slide.type === 'single' || slide.type === 'multi') && slide.options?.length) {
    const counts = [46, 28, 18, 12, 8, 5]
    const total = 80
    const options = slide.options.map((option, index) => ({
      id: option.id,
      letter: letterOf(index),
      label: option.label,
      price: option.price ?? null,
      count: counts[index] || 2,
      pct: percent(counts[index] || 2, total),
    })).sort((a, b) => b.count - a.count)
    return { kind: 'chart', mode: 'choice', total, options }
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
          <Field key={option.id} label={option.id === 'uti' ? 'Nombre de UTI' : option.id === 'uco' ? 'Nombre de UCO' : option.id === 'otros' ? 'Nombre de Otros' : 'Nombre de Clínica Médica'}>
            <input className="field" value={option.label} onChange={(event) => edit(index, { label: event.target.value })} />
          </Field>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3">
        <p className="editor-note">
        {priced ? 'Formato: estudio | precio | nota opcional.' : 'Una opción por línea si pegás un listado.'}
      </p>
      {options.map((option, index) => (
        <div key={option.id} className="grid gap-2 rounded-2xl border p-3" style={{ borderColor: '#b7c7c3' }}>
          <div className="flex items-center gap-2">
            <span className="w-8 font-bold">{letterOf(index)}</span>
            <input className="field" value={option.label} onChange={(event) => edit(index, { label: event.target.value })} />
          </div>
          {priced && (
            <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
              <input className="field" inputMode="numeric" value={option.price ?? 0} onChange={(event) => edit(index, { price: Number(event.target.value.replace(/[^\d]/g, '') || 0) })} />
              <input className="field" placeholder="Nota opcional" value={option.note || ''} onChange={(event) => edit(index, { note: event.target.value })} />
              <span className="editor-note self-center tabular-nums">{money(option.price || 0)}</span>
            </div>
          )}
          <div className="flex gap-2 text-sm">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0}>Subir</button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === options.length - 1}>Bajar</button>
            <button type="button" onClick={() => setOptions(options.filter((_, optionIndex) => optionIndex !== index))} disabled={options.length <= 2}>Quitar</button>
          </div>
        </div>
      ))}
      <button type="button" className="editor-btn justify-self-start" onClick={() => setOptions([...options, { id: newId(), label: 'Nueva opción', price: priced ? 0 : null, note: '' }])}>
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

function CardEditor({ cards, onChange }) {
  const list = cards || []
  function update(index, patch) {
    onChange(list.map((card, cardIndex) => cardIndex === index ? { ...card, ...patch } : card))
  }
  return (
    <div className="grid gap-3">
      {list.map((card, index) => (
        <div key={index} className="grid gap-2 rounded-2xl border p-3" style={{ borderColor: '#b7c7c3' }}>
          <input className="field" placeholder="Título del recuadro" value={card.label || ''} onChange={(event) => update(index, { label: event.target.value })} />
          <input className="field" placeholder="Valor, si es un número o un dato corto" value={card.value || ''} onChange={(event) => update(index, { value: event.target.value })} />
          <textarea className="field min-h-24" placeholder="Una viñeta por línea" value={(card.points || []).join('\n')} onChange={(event) => update(index, { points: event.target.value.split('\n') })} />
          <button type="button" className="justify-self-start text-sm" onClick={() => onChange(list.filter((_, cardIndex) => cardIndex !== index))}>Quitar este recuadro</button>
        </div>
      ))}
      <button type="button" className="editor-btn justify-self-start" onClick={() => onChange([...list, { label: 'Nuevo recuadro', value: '', points: [] }])}>
        Agregar recuadro
      </button>
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

  function changeType(nextType) {
    if (slide.locked || slide.role || nextType === slide.type) return
    const patch = { type: nextType }
    if ((nextType === 'single' || nextType === 'multi' || nextType === 'words') && !slide.question) {
      patch.question = slide.title || 'Nueva pregunta'
    }
    if ((nextType === 'single' || nextType === 'multi') && (slide.options || []).length < 2) {
      patch.options = [
        { id: newId(), label: 'Opción A', price: null, note: '' },
        { id: newId(), label: 'Opción B', price: null, note: '' },
      ]
    }
    patchSlide(patch)
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
    <div className="editor min-h-dvh">
      <header className="editor-bar">
        <div className="mr-auto">
          <p className="kicker">Editor</p>
          <p className="editor-note">{dirty ? 'Cambios sin guardar' : notice || 'En vivo con la sala'}</p>
        </div>
        <button type="button" className="editor-btn" onClick={onProject}>Volver a proyectar</button>
        <button type="button" className="editor-btn" onClick={exportCsv}>Exportar CSV</button>
        <button type="button" className="editor-btn" onClick={() => setPending({ type: 'restore' })}>Restaurar contenido</button>
        <button type="button" className="editor-btn editor-btn-primary" disabled={saving} onClick={save}>
          {saving ? 'Publicando…' : 'Guardar y publicar'}
        </button>
      </header>
      {error && <p className="px-4 pt-3 text-sm" style={{ color: '#e5383b' }} role="alert">{error}</p>}
      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)_360px]">
        <aside className="editor-side border-b p-4 lg:border-b-0 lg:border-r">
          <label className="mb-3 block lg:hidden">
            <span className="field-label">Diapositiva</span>
            <select className="field" value={selected} onChange={(event) => setSelected(Number(event.target.value))}>
              {draft.slides.map((item, index) => <option key={item.id} value={index}>{index + 1}. {slideName(item)}</option>)}
            </select>
          </label>
          <ol className="hidden max-h-[70vh] gap-1 overflow-auto lg:grid">
            {draft.slides.map((item, index) => (
              <li key={item.id}>
                <button type="button" className="editor-slide" data-on={index === selected ? 'true' : 'false'} onClick={() => setSelected(index)}>
                  <span className="editor-slide-meta">{String(index + 1).padStart(2, '0')} · {TYPE_LABEL[item.type] || item.type}{item.locked ? ' · base' : ''}</span>
                  <span className="editor-slide-title">{slideName(item)}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-4 grid gap-2">
            <span className="field-label">Nueva diapositiva al final</span>
            <div className="flex gap-2">
              <select className="field" aria-label="Tipo de la diapositiva nueva" value={addType} onChange={(event) => setAddType(event.target.value)}>
                {TYPES.filter((type) => type.id !== 'cost' || !hasCost).map((type) => <option key={type.id} value={type.id}>Nueva de {type.label.toLowerCase()}</option>)}
              </select>
              <button type="button" className="editor-btn" onClick={addSlide}>Agregar</button>
            </div>
          </div>
        </aside>
        <main className="grid gap-4 p-4" key={`${slide.id}-${epoch}`}>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="editor-btn" onClick={() => moveSlide(selected, -1)} disabled={selected === 0}>Subir</button>
            <button type="button" className="editor-btn" onClick={() => moveSlide(selected, 1)} disabled={selected === draft.slides.length - 1}>Bajar</button>
            <button type="button" className="editor-btn" disabled={slide.locked} title={slide.locked ? 'Esta diapositiva no se puede borrar: es parte del análisis.' : 'Eliminar'} onClick={() => setPending({ type: 'delete' })}>
              Eliminar
            </button>
          </div>
          <section className="editor-card">
            <p className="field-label">Tipo de esta diapositiva</p>
            {slide.locked ? (
              <p className="editor-note">
                {slide.role === 'service'
                  ? 'Esta diapositiva pregunta el área. En la proyección no se ven los botones: cada celular elige Clínica Médica, UTI, UCO u Otros. Los votos de después se separan por esa respuesta.'
                  : `Esta diapositiva es parte del análisis (${TYPE_LABEL[slide.type] || slide.type}). Podés cambiar los textos, no el tipo.`}
              </p>
            ) : (
              <>
                <select className="field" aria-label="Tipo de esta diapositiva" value={slide.type} onChange={(event) => changeType(event.target.value)}>
                  {TYPES.filter((type) => type.id !== 'cost').map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                </select>
                <p className="editor-note">
                  Si la pasás a texto, deja de pedir votos. Hasta que publiques, podés volver atrás y las opciones siguen acá.
                </p>
              </>
            )}
          </section>
          <section className="editor-card">
            <p className="field-label">Diseño de esta diapositiva</p>
            <SkinPicker value={slide.skin || 'claro'} onChange={(skin) => patchSlide({ skin })} />
          </section>
          <section className="editor-card">
            <p className="field-label">Textos</p>
            <Field label="Etiqueta superior"><input className="field" value={slide.kicker || ''} onChange={(event) => patchSlide({ kicker: event.target.value })} /></Field>
            <Field label="Título"><input className="field" value={slide.title || ''} onChange={(event) => patchSlide({ title: event.target.value })} /></Field>
            <Field label="Subtítulo"><input className="field" value={slide.subtitle || ''} onChange={(event) => patchSlide({ subtitle: event.target.value })} /></Field>
            {slide.type === 'text' && (
              <Field label="Cómo se ve">
                <select className="field" value={slide.variant || 'plain'} onChange={(event) => patchSlide({ variant: event.target.value })}>
                  {VARIANTS.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
                </select>
              </Field>
            )}
            <Field label="Párrafos, uno por línea">
              <textarea className="field min-h-28" value={(slide.body || []).join('\n')} onChange={(event) => patchSlide({ body: event.target.value.split('\n') })} />
            </Field>
            <p className="editor-note">Para cursiva, rodeá la palabra con asteriscos: *llevar*.</p>
          </section>
          {slide.type === 'text' && slide.variant !== 'takeaways' && slide.variant !== 'spotlight' && (
            <section className="editor-card">
              <p className="field-label">Recuadros</p>
              <CardEditor cards={slide.cards} onChange={(cards) => patchSlide({ cards })} />
            </section>
          )}
          {slide.type === 'text' && (
            <Field label="Franja al pie">
              <textarea className="field min-h-20" value={slide.footnote || ''} onChange={(event) => patchSlide({ footnote: event.target.value })} />
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
                <p className="editor-note mt-2">Mientras escriben se ve la nube. Al mostrar resultados, el gráfico de las más repetidas.</p>
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
                <button type="button" className="editor-btn justify-self-start" onClick={() => { setDirty(true); setDraft({ ...draft, priceTable: [...draft.priceTable, { id: newId(), label: 'Nuevo ítem', price: 0 }] }) }}>
                  Agregar fila
                </button>
              </div>
            </>
          )}
        </main>
        <aside className="editor-side grid content-start gap-4 border-t p-4 lg:border-l lg:border-t-0">
          <div>
            <p className="field-label">Colores de toda la sala</p>
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
            <button type="button" className="editor-btn mt-4" onClick={() => patchDesign({ accent1: DEFAULT_DESIGN.accent1, accent2: DEFAULT_DESIGN.accent2, background: DEFAULT_DESIGN.background, card: DEFAULT_DESIGN.card, text: DEFAULT_DESIGN.text })}>
              Volver a los colores originales
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sample} onChange={(event) => setSample(event.target.checked)} />
            Ver resultados de ejemplo
          </label>
          <div className="h-[560px] overflow-auto rounded-3xl border" style={{ borderColor: 'var(--line)', background: draft.design.background }}>
            <ThemeScope design={draft.design} className="block h-full">
              <div className="relative h-full min-h-[560px]">
                <SlideView
                  mode="preview"
                  slide={slide}
                  slideIndex={draft.slides.findIndex((item) => item.id === slide.id)}
                  slideCount={draft.slides.length}
                  results={sample ? sampleResults(slide) : (slide.type === 'cost' ? sampleResults(slide) : null)}
                  liveWords={!sample && slide.type === 'words' ? (state.liveWords?.words?.length && state.slides?.[state.slideIndex]?.id === slide.id ? state.liveWords : SAMPLE_CLOUD) : null}
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
        <Modal title="¿Restaurar el contenido original?" body="Se vuelven a publicar las 36 diapositivas y la tabla de precios. El diseño de colores se conserva. Los votos no se borran." confirmLabel="Restaurar" danger onClose={() => setPending(null)} onConfirm={restore} />
      )}
    </div>
  )
}
