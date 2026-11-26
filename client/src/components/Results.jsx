import { formatPct, money } from '@shared/format.js'
import { groupColor } from '@shared/groups.js'
import { useEffect, useState } from 'react'

function Meter({ value, color }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  const width = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className="chart-meter overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
      <div className="meter h-full rounded-full" style={{ width: ready ? `${width}%` : '0%', background: color }} />
    </div>
  )
}

function topLine(items, kind) {
  if (!items?.length) return 'Sin respuestas'
  if (kind === 'words') {
    return items.length === 1 ? `Más repetida: ${items[0].text}` : `Empate: ${items.map((item) => item.text).join(' · ')}`
  }
  return items.length === 1
    ? `Más votada: ${items[0].letter}. ${items[0].label}`
    : `Empate: ${items.map((item) => `${item.letter}. ${item.label}`).join(' · ')}`
}

function GroupDeck({ mode, groups, summary, detail, footer, countLabel }) {
  const [open, setOpen] = useState([])
  const ids = groups.map((group) => group.id)
  const allOpen = ids.length > 0 && ids.every((id) => open.includes(id))
  const columns = mode === 'present'
    ? (groups.length > 3 ? 'grid gap-4 md:grid-cols-2' : 'grid gap-4 md:grid-cols-3')
    : 'grid gap-3'
  return (
    <div>
      {mode === 'present' && groups.length > 1 && (
        <div className="mb-3 flex justify-end">
          <button type="button" className="rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: 'var(--card)' }} onClick={() => setOpen(allOpen ? [] : ids)}>
            {allOpen ? 'Compactar' : 'Ver el detalle por servicio'}
          </button>
        </div>
      )}
      <div className={mode === 'present' && groups.length > 1 ? columns : 'grid gap-3'}>
        {groups.map((group) => {
          const expanded = open.includes(group.id)
          const color = groupColor(group.id)
          return (
            <article key={group.id} className="overflow-hidden rounded-3xl border" style={{ background: 'var(--card)', borderColor: 'var(--line)', borderTop: `4px solid ${color}` }}>
              <button type="button" className="w-full p-5 text-left" aria-expanded={expanded} onClick={() => setOpen((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])}>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="text-2xl font-semibold tracking-tight">{group.label}</span>
                  </span>
                  <span className="whitespace-nowrap text-sm" style={{ color: 'var(--muted)' }}>
                    {countLabel ? countLabel(group) : `${group.n} ${group.n === 1 ? 'respuesta' : 'respuestas'}`}
                  </span>
                </div>
                <p className="mt-3 text-lg leading-snug">{summary(group)}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                  {expanded ? 'Ocultar detalle' : 'Tocá para ver el detalle'}
                </p>
              </button>
              {expanded && <div className="px-5 pb-5">{detail(group, color)}</div>}
            </article>
          )
        })}
      </div>
      {footer}
    </div>
  )
}

export function ServiceBoard({ results, connected = 0, mode = 'audience' }) {
  const pending = Math.max(0, connected - (results?.total || 0))
  const count = (results?.groups || []).length
  const columns = mode === 'present'
    ? (count > 3 ? 'grid gap-4 md:grid-cols-2' : 'grid gap-4 md:grid-cols-3')
    : 'grid gap-3'
  return (
    <div>
      <div className={columns}>
        {(results?.groups || []).map((group) => (
          <article key={group.id} className="rounded-3xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)', borderTop: `4px solid ${groupColor(group.id)}` }}>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em]" style={{ color: groupColor(group.id) }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: groupColor(group.id) }} />
              {group.label}
            </div>
            <p className="mt-2 text-5xl font-semibold tabular-nums">{group.count}</p>
            <p style={{ color: 'var(--muted)' }}>{formatPct(group.pct)}</p>
            <div className="mt-4"><Meter value={group.pct} color={groupColor(group.id)} /></div>
          </article>
        ))}
      </div>
      {pending > 0 && <p className="mt-4" style={{ color: 'var(--muted)' }}>Todavía sin elegir: {pending}</p>}
    </div>
  )
}

function ChoiceBars({ group, color }) {
  if (!group.n) return <p style={{ color: 'var(--muted)' }}>Nadie de este grupo respondió todavía.</p>
  return (
    <div className="grid gap-3">
      {group.options.map((option) => (
        <div key={option.id}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0">
              <strong className="mr-2">{option.letter}</strong>
              {option.label}
              {option.price != null && <span style={{ color: 'var(--muted)' }}> · {money(option.price)}</span>}
            </span>
            <span className="chart-count shrink-0">{option.count} · {formatPct(option.pct)}</span>
          </div>
          <Meter value={option.pct} color={color} />
        </div>
      ))}
    </div>
  )
}

function ChartRows({ rows, totalLabel }) {
  const max = Math.max(...rows.map((row) => row.count), 1)
  if (!rows.length) return <p style={{ color: 'var(--muted)' }}>Nadie votó todavía.</p>
  return (
    <div>
      {totalLabel && <p className="chart-total mb-4">{totalLabel}</p>}
      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.id || row.text} className="chart-row">
            <div className="mb-1.5 flex items-baseline justify-between gap-4">
              <span className="chart-label min-w-0">
                {row.letter && <strong className="mr-2">{row.letter}</strong>}
                {row.label || row.text}
              </span>
              <span className="chart-count shrink-0">
                {row.pct != null && <span className="chart-pct">{formatPct(row.pct)}</span>}
                <span className="chart-n">{row.count}</span>
              </span>
            </div>
            <Meter value={(row.count / max) * 100} color="var(--accent)" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartBoard({ results }) {
  const total = results?.total || 0
  const people = `${total} ${total === 1 ? 'votante' : 'votantes'}`
  if (results?.mode === 'words') {
    return <ChartRows rows={results.words || []} totalLabel={people} />
  }
  if (results?.mode === 'cost') {
    return (
      <div className="grid gap-6">
        <p className="chart-total">
          Costo medio <span className="chart-pct">{money(results.mean)}</span> · {people}
        </p>
        <div>
          <p className="chart-heading">Estudios más pedidos</p>
          <ChartRows rows={results.studies || []} />
        </div>
        {(results.hypotheses || []).length > 0 && (
          <div className="grid gap-3">
            <p className="chart-heading">Costo medio según la hipótesis</p>
            {results.hypotheses.map((row) => (
              <div key={row.id} className="chart-row flex items-baseline justify-between gap-4">
                <span className="chart-label min-w-0">{row.label}</span>
                <span className="chart-count shrink-0">
                  <span className="chart-pct">{money(row.mean)}</span>
                  <span className="chart-n">{row.n}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  return <ChartRows rows={results?.options || []} totalLabel={people} />
}

export function WordCloud({ words, total = 0 }) {
  const list = words || []
  const max = Math.max(...list.map((word) => word.count), 1)
  if (!list.length) {
    return <p className="word-cloud-empty">La sala está escribiendo desde el celular.</p>
  }
  const people = `${total} ${total === 1 ? 'persona escribiendo' : 'personas escribiendo'}`
  return (
    <div>
      <p className="chart-total mb-5">{people}</p>
      <div className="word-cloud">
        {list.map((word) => (
          <span key={word.text} className="word-cloud-item" style={{ '--grow': word.count / max }}>
            {word.text}
            {word.count > 1 && <span className="word-cloud-n">{word.count}</span>}
          </span>
        ))}
      </div>
    </div>
  )
}


export function ChoiceBoard({ results, mode }) {
  return (
    <GroupDeck
      mode={mode}
      groups={results.groups}
      summary={(group) => topLine(group.top, 'choice')}
      detail={(group, color) => <ChoiceBars group={group} color={color} />}
      footer={results.unassigned > 0 ? <p className="mt-4" style={{ color: 'var(--muted)' }}>Sin servicio asignado: {results.unassigned}</p> : null}
    />
  )
}

function WordDetail({ group, color, modeCloud }) {
  if (!group.n) return <p style={{ color: 'var(--muted)' }}>Nadie de este grupo escribió todavía.</p>
  if (!modeCloud) {
    return (
      <ol className="max-h-80 overflow-auto">
        {group.words.map((word) => (
          <li key={word.text} className="flex items-baseline justify-between gap-4 border-b py-2" style={{ borderColor: 'var(--line)' }}>
            <span>{word.text}</span>
            <span className="tabular-nums" style={{ color: 'var(--muted)' }}>{word.count}</span>
          </li>
        ))}
      </ol>
    )
  }
  const max = group.words[0]?.count || 1
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 py-1">
      {group.words.slice(0, 40).map((word) => (
        <span key={word.text} style={{ color, fontSize: `${0.95 + (word.count / max) * 1.7}rem`, opacity: 0.55 + (word.count / max) * 0.45, fontWeight: 700 }}>
          {word.text}
        </span>
      ))}
    </div>
  )
}

export function WordBoard({ results, mode }) {
  return (
    <GroupDeck
      mode={mode}
      groups={results.groups}
      summary={(group) => topLine(group.top, 'words')}
      detail={(group, color) => <WordDetail group={group} color={color} modeCloud={results.mode !== 'list'} />}
      footer={results.unassigned > 0 ? <p className="mt-4" style={{ color: 'var(--muted)' }}>Sin servicio asignado: {results.unassigned}</p> : null}
    />
  )
}

export function CostBoard({ results, priceTable = [], footnote = '', myCost = null, mode = 'audience' }) {
  return (
    <div>
      {results?.kind === 'cost' && (
        <>
          <p className="mb-4" style={{ color: 'var(--muted)' }}>Sobre {results.total} {results.total === 1 ? 'pedido cargado' : 'pedidos cargados'} en las primeras horas.</p>
          <GroupDeck
            mode={mode}
            groups={results.groups}
            countLabel={(group) => `${group.n} ${group.n === 1 ? 'pedido' : 'pedidos'}`}
            summary={(group) => (group.n ? money(group.mean) : 'Sin pedidos')}
            detail={(group, color) => {
              if (!group.n) return <p style={{ color: 'var(--muted)' }}>Nadie de este grupo cargó estudios.</p>
              const max = Math.max(...group.byHypothesis.map((row) => row.mean), 1)
              return (
                <div className="grid gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>Costo medio según la hipótesis inicial</p>
                  {group.byHypothesis.map((row) => (
                    <div key={row.id}>
                      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0">{row.label}</span>
                        <span className="shrink-0 tabular-nums">{money(row.mean)} · n={row.n}</span>
                      </div>
                      <Meter value={(row.mean / max) * 100} color={color} />
                    </div>
                  ))}
                </div>
              )
            }}
            footer={results.unassigned?.n > 0 ? (
              <p className="mt-4" style={{ color: 'var(--muted)' }}>
                Sin servicio asignado: {results.unassigned.n} · costo medio {money(results.unassigned.mean)}
              </p>
            ) : null}
          />
        </>
      )}
      {mode === 'audience' && (
        <p className="mt-5 text-lg">Tu pedido: {myCost == null ? 'todavía no cargaste estudios' : money(myCost)}</p>
      )}
      {priceTable.length > 0 && (
        <table className="mt-8 w-full text-left text-sm md:text-base">
          <caption className="mb-2 text-left text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Tabla de referencia</caption>
          <tbody>
            {priceTable.map((row) => (
              <tr key={row.id} className="border-t" style={{ borderColor: 'var(--line)' }}>
                <td className="py-2.5 pr-4">{row.label}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{money(row.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {footnote && <p className="footnote">{footnote}</p>}
    </div>
  )
}
