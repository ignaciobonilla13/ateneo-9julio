import { letterOf, money } from '@shared/format.js'
import { sanitizeWord } from '@shared/text.js'
import { useEffect, useState } from 'react'
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

function hexagon(cx, cy, radius) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30)
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`
  }).join(' ')
}

function SheetArt() {
  const solids = [
    [1380, 210, 78],
    [1510, 390, 56],
    [1260, 520, 34],
  ]
  const outlines = [
    [1240, 150, 36],
    [1460, 250, 28],
    [1320, 430, 46],
    [1540, 560, 24],
    [180, 760, 30],
  ]
  return (
    <div className="sheet-art" aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="var(--accent)" strokeWidth="1.6" opacity="0.45">
          <path d="M-40 70 C 180 10, 340 150, 560 70 S 920 0, 1180 80 S 1500 20, 1680 90" />
          <path d="M-40 108 C 200 48, 360 188, 580 108 S 960 30, 1220 118 S 1520 50, 1680 128" />
          <path d="M-40 146 C 220 86, 380 226, 600 146 S 990 70, 1260 156" />
          <path d="M-40 790 C 220 730, 420 860, 680 790 S 1080 700, 1400 800 S 1560 760, 1680 820" />
          <path d="M-40 828 C 240 768, 440 900, 700 828 S 1120 740, 1440 838" />
          <path d="M80 866 C 300 806, 520 940, 780 866 S 1180 790, 1480 876" />
        </g>
        <g fill="var(--accent)">
          {solids.map(([cx, cy, radius]) => <polygon key={`s-${cx}-${cy}`} points={hexagon(cx, cy, radius)} opacity="0.82" />)}
        </g>
        <g fill="var(--accent2)" opacity="0.55">
          <polygon points={hexagon(1430, 330, 40)} />
        </g>
        <g fill="none" stroke="var(--accent)" strokeWidth="3">
          {outlines.map(([cx, cy, radius]) => <polygon key={`o-${cx}-${cy}`} points={hexagon(cx, cy, radius)} opacity="0.8" />)}
        </g>
      </svg>
    </div>
  )
}

function Rich({ text }) {
  const parts = String(text || '').split(/(\*[^*\n]+\*)/g)
  return parts.map((part, index) => (
    part.startsWith('*') && part.endsWith('*')
      ? <em key={index}>{part.slice(1, -1)}</em>
      : <span key={index}>{part}</span>
  ))
}

function Body({ lines }) {
  if (!lines?.length) return null
  return (
    <ul className="slide-body">
      {lines.map((line, index) => <li key={`${index}-${line}`}><Rich text={line} /></li>)}
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
          <span><Rich text={line} /></span>
        </li>
      ))}
    </ol>
  )
}

function PointLine({ text }) {
  const index = text.indexOf(':')
  if (index > 0 && index < 48) {
    return <><strong>{text.slice(0, index + 1)}</strong>{text.slice(index + 1)}</>
  }
  return <Rich text={text} />
}

function PointCards({ cards }) {
  return (
    <div className="point-grid">
      {cards.map((card) => (
        <article key={card.label} className="point-card">
          <h3>{card.label}</h3>
          <ul>
            {(card.points || []).map((point) => <li key={point}><PointLine text={point} /></li>)}
          </ul>
        </article>
      ))}
    </div>
  )
}

function BarsSlide({ slide }) {
  return (
    <div className="bars-layout">
      <div>
        {slide.subtitle && <p className="bars-caption">{slide.subtitle}</p>}
        <div className="bars">
          {(slide.cards || []).map((card, index) => {
            const value = Number(String(card.value).replace(',', '.')) || 0
            return (
              <div key={card.label} className="bar-col">
                <span className="bar-value">{card.value}</span>
                <div className="bar-track">
                  <div className="bar" data-tone={index === 0 ? 'muted' : 'accent'} style={{ height: `${Math.max(8, Math.min(100, value))}%` }} />
                </div>
                <span className="bar-label">{card.label}</span>
              </div>
            )
          })}
        </div>
      </div>
      <ol className="step-list">
        {(slide.body || []).map((line) => <li key={line}><Rich text={line} /></li>)}
      </ol>
    </div>
  )
}

function Narrative({ slide }) {
  if (slide.variant === 'takeaways') return <Takeaways lines={slide.body || []} />
  if (slide.variant === 'bars') return <BarsSlide slide={slide} />
  if (slide.variant === 'spotlight') return null
  const withPoints = (slide.cards || []).some((card) => card.points?.length)
  return (
    <div className="grid gap-5">
      <Body lines={slide.body} />
      {withPoints && <PointCards cards={slide.cards} />}
      {!withPoints && slide.cards?.length > 0 && (slide.variant === 'criteria' ? <Criteria cards={slide.cards} /> : <Labs cards={slide.cards} />)}
    </div>
  )
}

function useDesktopAudience(mode) {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    if (mode !== 'audience') return undefined
    const query = window.matchMedia('(min-width: 900px)')
    const update = () => setDesktop(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [mode])
  return desktop
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
  const desktopAudience = useDesktopAudience(mode)
  const [local, setLocal] = useState(null)
  const [voteError, setVoteError] = useState('')
  const [draftWord, setDraftWord] = useState('')
  if (!slide) return null

  const interactive = mode === 'audience' && typeof onVote === 'function'
  const currentValue = local?.slideId === slide.id ? local.value : myVote
  const selectedIds = Array.isArray(currentValue) ? currentValue : (typeof currentValue === 'string' && currentValue ? [currentValue] : [])
  const reveal = mode === 'present' && !!results
  const choiceOptions = (slide.options || []).filter((option) => String(option.label || '').trim())
  const onStage = mode === 'present' || mode === 'preview'
  const showButtons = (slide.type === 'single' || slide.type === 'multi') && choiceOptions.length > 0 && !(onStage && (reveal || slide.role === 'service'))
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
  const darkLook = slide.skin === 'oscuro' || slide.variant === 'spotlight'
  const content = (
    <div className="slide-frame mx-auto w-full max-w-6xl" data-variant={slide.variant || 'plain'} data-skin={slide.skin || 'claro'}>
      {slide.id === 's-disnea-portada' && (
        <img className="brand-logo" src="/jornada.png" alt="IX Jornada Académica · Sanatorio 9 de Julio" />
      )}
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="kicker" data-pill={slide.kicker && (mode !== 'audience' || slide.kicker.includes('·') || slide.variant === 'spotlight') ? 'true' : 'false'}>{slide.kicker}</p>
        {mode === 'audience' && !desktopAudience && (
          <p className="text-sm tabular-nums" style={{ color: darkLook ? 'rgba(247,251,250,0.62)' : 'var(--muted)' }}>
            {String(slideIndex + 1).padStart(2, '0')} / {String(slideCount).padStart(2, '0')}
          </p>
        )}
      </div>
      {slide.title && <h1 className="slide-title"><Rich text={slide.title} /></h1>}
      {slide.subtitle && slide.variant !== 'bars' && <p className="slide-subtitle"><Rich text={slide.subtitle} /></p>}
      {hasNarrative && <div className="mt-6"><Narrative slide={slide} /></div>}
      {slide.type === 'text' && slide.footnote && (
        <p className={slide.footnote.trimStart().startsWith('«') ? 'callout callout-quote' : 'callout'}>{slide.footnote}</p>
      )}
      {hasNarrative && slide.question && <div className="my-6 h-px" style={{ background: 'var(--line)' }} />}
      {slide.question && slide.question !== slide.title && slide.type !== 'text' && slide.type !== 'cost' && (
        <h2 className={slide.title ? 'question' : 'slide-title'}>{slide.question}</h2>
      )}
      {mode === 'present' && slide.id === 's-disnea-portada' && publicUrl && (
        <div className="mt-8 flex justify-center">
          <QrCard url={publicUrl} hosts={hosts} size={240} />
        </div>
      )}
      {onStage && slide.role === 'service' && !reveal && (
        <p className="mt-8 text-3xl font-semibold tracking-tight md:text-4xl">{choiceOptions.map((option) => option.label).join('   ·   ')}</p>
      )}
      {showButtons && (
        <div className="options mt-4 grid gap-3">
          {choiceOptions.map((option, index) => (
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

  if (mode === 'audience' && desktopAudience) {
    return (
      <div className="audience-stage">
        <div className="stage">
          <div className="mode-audience audience-framed sheet-host relative h-full">
            <ProgressBar index={slideIndex} count={slideCount} position="absolute" />
            <article className="sheet">
              <SheetArt />
              <div className="sheet-bar" />
              <div className="sheet-body">{content}</div>
              <footer className="sheet-foot">
                <span>IX Jornada Académica · Sanatorio 9 de Julio</span>
                <span className="tabular-nums">{String(slideIndex + 1).padStart(2, '0')} / {String(slideCount).padStart(2, '0')}</span>
              </footer>
            </article>
          </div>
        </div>
      </div>
    )
  }

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
    <div className={`mode-${mode} sheet-host relative h-full`}>
      <ProgressBar index={slideIndex} count={slideCount} position="absolute" />
      <article className="sheet">
        <SheetArt />
        <div className="sheet-bar" />
        <div className="sheet-body">{content}</div>
        <footer className="sheet-foot">
          <span>IX Jornada Académica · Sanatorio 9 de Julio</span>
          <span className="tabular-nums">{String(slideIndex + 1).padStart(2, '0')} / {String(slideCount).padStart(2, '0')}</span>
        </footer>
      </article>
    </div>
  )
}
