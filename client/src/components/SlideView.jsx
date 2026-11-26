import { letterOf, money } from '@shared/format.js'
import { sanitizeWord } from '@shared/text.js'
import { useState } from 'react'
import { ProgressBar } from './Chrome.jsx'
import { QrCard } from './QrPanel.jsx'
import { ChoiceBoard, CostBoard, ServiceBoard, WordBoard } from './Results.jsx'

export function OptionButton({ letter, label, price = null, note = '', selected = false, disabled = false, onClick }) {
  return (
    <button type="button" className="option-btn" data-selected={selected ? 'true' : 'false'} disabled={disabled} aria-pressed={selected} onClick={onClick}>
      <span className="letter">{letter}</span>
      <span className="min-w-0 flex-1">
        <span className="block leading-snug">{label}</span>
        {price != null && (
          <span className="mt-1 block text-sm" style={{ color: 'var(--muted)' }}>
            {money(price)}{note ? ` · ${note}` : ''}
          </span>
        )}
      </span>
    </button>
  )
}

function Body({ lines }) {
  if (!lines?.length) return null
  return (
    <ul className="slide-body">
      {lines.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}
    </ul>
  )
}

function Labs({ cards }) {
  return (
    <div className="lab-grid">
      {cards.map((card) => (
        <div key={`${card.label}-${card.value}`} className="lab-card" data-hot={/lactato|^ph$/i.test(card.label) ? 'true' : 'false'}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </div>
      ))}
    </div>
  )
}

function Criteria({ cards }) {
  return (
    <div className="criteria-grid">
      {cards.map((card) => {
        const tone = /recomend/i.test(card.value) ? 'var(--accent)' : /suger/i.test(card.value) ? 'var(--accent2)' : 'var(--text)'
        return (
          <div key={`${card.label}-${card.value}`} className="criteria-card">
            <span>{card.label}</span>
            <strong style={{ color: tone }}>{card.value}</strong>
          </div>
        )
      })}
    </div>
  )
}

function Takeaways({ lines }) {
  return (
    <ol className="takeaways">
      {lines.map((line, index) => (
        <li key={`${index}-${line}`}>
          <span className="num">{index + 1}</span>
          <span>{line}</span>
        </li>
      ))}
    </ol>
  )
}

function Narrative({ slide }) {
  if (slide.variant === 'takeaways') return <Takeaways lines={slide.body || []} />
  return (
    <div className="grid gap-5">
      <Body lines={slide.body} />
      {slide.cards?.length > 0 && (slide.variant === 'criteria' ? <Criteria cards={slide.cards} /> : <Labs cards={slide.cards} />)}
    </div>
  )
}

export function SlideView({
  mode = 'audience',
  slide,
  slideIndex = 0,
  slideCount = 1,
  myVote = null,
  myCost = null,
  results = null,
  priceTable = [],
  publicUrl = '',
  hosts = [],
  connected = 0,
  onVote,
}) {
  const [local, setLocal] = useState(null)
  const [voteError, setVoteError] = useState('')
  const [draftWord, setDraftWord] = useState('')
  if (!slide) return null

  const interactive = mode === 'audience' && typeof onVote === 'function'
  const currentValue = local?.slideId === slide.id ? local.value : myVote
  const selectedIds = Array.isArray(currentValue) ? currentValue : (typeof currentValue === 'string' && currentValue ? [currentValue] : [])
  const reveal = mode === 'present' && !!results
  const showButtons = (slide.type === 'single' || slide.type === 'multi') && !(mode === 'present' && (reveal || slide.role === 'service'))
  const atMax = slide.type === 'multi' && slide.maxSelect && selectedIds.length >= slide.maxSelect
  const running = (slide.options || []).reduce((sum, option) => sum + (selectedIds.includes(option.id) ? Number(option.price) || 0 : 0), 0)

  async function send(value) {
    setLocal({ slideId: slide.id, value })
    setVoteError('')
    const response = await onVote(slide.id, value)
    if (!response?.ok) {
      setLocal(null)
      setVoteError(response?.error || 'No se pudo enviar el voto')
      return
    }
    setLocal({ slideId: slide.id, value: response.value })
  }

  function chooseSingle(optionId) {
    if (!interactive) return
    void send(optionId)
  }

  function toggleMulti(optionId) {
    if (!interactive) return
    const has = selectedIds.includes(optionId)
    if (!has && atMax) {
      setVoteError(slide.maxSelect === 1 ? 'Podés elegir una sola opción' : `Máximo ${slide.maxSelect} opciones`)
      return
    }
    const next = new Set(selectedIds)
    if (has) next.delete(optionId)
    else next.add(optionId)
    const ordered = (slide.options || []).map((option) => option.id).filter((id) => next.has(id))
    void send(ordered)
  }

  function addWord(event) {
    event.preventDefault()
    if (!interactive) return
    const word = sanitizeWord(draftWord)
    const words = Array.isArray(currentValue) ? currentValue : []
    if (!word) return
    if (words.some((item) => item.toLocaleLowerCase('es') === word.toLocaleLowerCase('es'))) {
      setVoteError('Esa palabra ya está')
      return
    }
    if (words.length >= (slide.maxWords || 5)) {
      setVoteError(`Máximo ${slide.maxWords || 5} palabras`)
      return
    }
    setDraftWord('')
    void send([...words, word])
  }

  function removeWord(word) {
    const words = (Array.isArray(currentValue) ? currentValue : []).filter((item) => item !== word)
    void send(words)
  }

  const hasNarrative = (slide.body?.length || 0) > 0 || (slide.cards?.length || 0) > 0
  const content = (
    <div className="mx-auto w-full max-w-6xl" data-variant={slide.variant || 'plain'}>
      {slide.role === 'service' && (
        <img className="brand-logo" src="/jornada.png" alt="IX Jornada Académica · Sanatorio 9 de Julio" />
      )}
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="kicker">{slide.kicker}</p>
        <p className="text-sm tabular-nums" style={{ color: 'var(--muted)' }}>
          {String(slideIndex + 1).padStart(2, '0')} / {String(slideCount).padStart(2, '0')}
        </p>
      </div>
      {slide.title && <h1 className="slide-title">{slide.title}</h1>}
      {slide.subtitle && <p className="slide-subtitle">{slide.subtitle}</p>}
      {hasNarrative && <div className="mt-6"><Narrative slide={slide} /></div>}
      {hasNarrative && slide.question && <div className="my-6 h-px" style={{ background: 'var(--line)' }} />}
      {slide.question && slide.type !== 'text' && slide.type !== 'cost' && <h2 className="question">{slide.question}</h2>}
      {mode === 'present' && slide.role === 'service' && publicUrl && (
        <div className="mt-6 grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <p className="text-3xl font-semibold tracking-tight md:text-4xl">{(slide.options || []).map((option) => option.label).join('   ·   ')}</p>
          <QrCard url={publicUrl} hosts={hosts} size={300} />
        </div>
      )}
      {showButtons && (
        <div className="options mt-4 grid gap-3">
          {(slide.options || []).map((option, index) => (
            <OptionButton
              key={option.id}
              letter={letterOf(index)}
              label={option.label}
              price={option.price}
              note={option.note}
              selected={selectedIds.includes(option.id)}
              disabled={!interactive || (atMax && !selectedIds.includes(option.id))}
              onClick={() => (slide.type === 'multi' ? toggleMulti(option.id) : chooseSingle(option.id))}
            />
          ))}
          {slide.type === 'multi' && slide.maxSelect && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Hasta {slide.maxSelect} {slide.maxSelect === 1 ? 'opción' : 'opciones'}.</p>
          )}
          {interactive && selectedIds.length > 0 && (
            <p className="text-base font-semibold" style={{ color: 'var(--accent)' }}>
              Quedó guardada: {(slide.options || []).filter((option) => selectedIds.includes(option.id)).map((option) => option.label).join(', ')}. La diapositiva cambia cuando el dueño de la sala avanza.
            </p>
          )}
        </div>
      )}
      {slide.type === 'words' && mode === 'audience' && (
        <form onSubmit={addWord} className="mt-4">
          <div className="flex gap-2">
            <input className="field" value={draftWord} maxLength={40} placeholder="Escribí un dato y enviá" enterKeyHint="send" onChange={(event) => setDraftWord(event.target.value)} />
            <button type="submit" className="rounded-2xl px-4 font-semibold text-white" style={{ background: 'var(--accent)' }} disabled={(Array.isArray(currentValue) ? currentValue.length : 0) >= (slide.maxWords || 5)}>
              Sumar
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Array.isArray(currentValue) ? currentValue : []).map((word) => (
              <button key={word} type="button" className="rounded-full border px-3 py-1.5" style={{ borderColor: 'var(--accent)' }} onClick={() => removeWord(word)}>
                {word} ×
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{Array.isArray(currentValue) ? currentValue.length : 0} de {slide.maxWords || 5}</p>
        </form>
      )}
      {slide.type === 'words' && mode === 'present' && !results && (
        <p className="mt-8 text-2xl" style={{ color: 'var(--muted)' }}>La sala está escribiendo desde el celular.</p>
      )}
      {voteError && <p className="mt-3 text-sm" style={{ color: 'var(--accent)' }} role="alert">{voteError}</p>}
      <div className="mt-6" aria-live="polite">
        {results?.kind === 'service' && <ServiceBoard results={results} connected={connected} mode={mode} />}
        {results?.kind === 'choice' && <ChoiceBoard results={results} mode={mode} />}
        {results?.kind === 'words' && <WordBoard results={results} mode={mode} />}
        {(slide.type === 'cost' || slide.role === 'cost') && (
          <CostBoard results={results} priceTable={priceTable} footnote={slide.footnote} myCost={myCost} mode={mode} />
        )}
      </div>
    </div>
  )

  if (mode === 'audience') {
    return (
      <>
        <ProgressBar index={slideIndex} count={slideCount} position="fixed" />
        <div className="mode-audience px-5 pb-36 pt-7">{content}</div>
        {slide.role === 'studies' && (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t px-5 py-3" style={{ background: 'color-mix(in srgb, var(--bg) 92%, black)', borderColor: 'var(--line)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <div className="mx-auto flex max-w-6xl items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Tu pedido</span>
              <strong className="text-2xl tabular-nums">{money(running)}</strong>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className={`mode-${mode} relative h-full`}>
      <ProgressBar index={slideIndex} count={slideCount} position="absolute" />
      <div className={`h-full overflow-y-auto px-6 pt-10 ${mode === 'present' ? 'pb-28' : 'pb-8'}`}>{content}</div>
    </div>
  )
}
