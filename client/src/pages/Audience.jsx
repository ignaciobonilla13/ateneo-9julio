import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { letterOf } from '@shared/format.js'
import { LoadingScreen } from '../components/Chrome.jsx'
import { OptionButton, SlideView } from '../components/SlideView.jsx'
import { ThemeScope } from '../components/ThemeScope.jsx'
import { useAudience } from '../realtime/useAudience.js'

export default function AudiencePage() {
  const { status, sync, vote } = useAudience()
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [sync?.slideIndex])

  if (!sync) {
    return (
      <LoadingScreen
        label={status === 'offline' ? 'No pudimos entrar a la sala. Revisá la red y recargá.' : 'Conectando con la sala…'}
        action={status === 'offline' ? () => window.location.reload() : null}
      />
    )
  }

  const service = sync.myService || pending
  const needsService = !service && sync.slide?.role !== 'service'

  async function pick(optionId) {
    setPending(optionId)
    setError('')
    const response = await vote(sync.servicePrompt?.slideId, optionId)
    if (!response.ok) {
      setPending(null)
      setError(response.error || 'No se pudo guardar el servicio')
    }
  }

  return (
    <ThemeScope design={sync.design} global>
      <div className="glow min-h-dvh" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' }}>
        {status === 'reconnecting' && <div className="reconnect">Reconectando…</div>}
        {needsService ? (
          <div className="mode-audience mx-auto max-w-3xl px-5 pb-16 pt-16">
            <p className="kicker">Antes de seguir</p>
            <h1 className="slide-title mt-3">{sync.servicePrompt?.question || '¿En qué servicio trabajás?'}</h1>
            <p className="mt-3" style={{ color: 'var(--muted)' }}>Es anónimo. Sirve para agrupar tus votos con los de tu servicio.</p>
            <div className="mt-8 grid gap-3">
              {(sync.servicePrompt?.options || []).map((option, index) => (
                <OptionButton key={option.id} letter={letterOf(index)} label={option.label} onClick={() => pick(option.id)} />
              ))}
            </div>
            {error && <p className="mt-4" role="alert" style={{ color: 'var(--accent)' }}>{error}</p>}
          </div>
        ) : (
          <SlideView
            mode="audience"
            slide={sync.slide}
            slideIndex={sync.slideIndex}
            slideCount={sync.slideCount}
            myVote={sync.myVote}
            myCost={sync.myCost}
            results={sync.results}
            priceTable={sync.priceTable}
            connected={sync.connected}
            onVote={vote}
          />
        )}
        <div className="px-5 pt-4 text-right">
          <Link to="/sala" className="text-sm" style={{ color: 'var(--muted)' }}>Acceder como dueño de la sala</Link>
        </div>
      </div>
    </ThemeScope>
  )
}
