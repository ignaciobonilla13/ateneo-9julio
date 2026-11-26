import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LoadingScreen } from '../components/Chrome.jsx'
import { SlideView } from '../components/SlideView.jsx'
import { ThemeScope } from '../components/ThemeScope.jsx'
import { useAudience } from '../realtime/useAudience.js'

export default function AudiencePage() {
  const { status, sync, vote } = useAudience()

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

  return (
    <ThemeScope design={sync.design} global>
      <div className="glow min-h-dvh" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' }}>
        {status === 'reconnecting' && <div className="reconnect">Reconectando…</div>}
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
        <div className="audience-owner">
          <Link to="/sala">Acceder como dueño de la sala</Link>
        </div>
      </div>
    </ThemeScope>
  )
}
