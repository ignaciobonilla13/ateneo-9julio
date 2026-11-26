import { useEffect, useState } from 'react'
import { LoadingScreen, Modal } from '../components/Chrome.jsx'
import { ControlDock } from '../components/ControlDock.jsx'
import { QrOverlay } from '../components/QrPanel.jsx'
import { SlideView } from '../components/SlideView.jsx'
import { ThemeScope } from '../components/ThemeScope.jsx'
import { useSlideKeys } from '../lib/keys.js'
import { usePresenter } from '../realtime/PresenterContext.jsx'

export default function PresenterPage({ onEdit }) {
  const { state, status, actions } = usePresenter()
  const [qr, setQr] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [config, setConfig] = useState({ publicUrl: null, hosts: [] })

  useEffect(() => {
    fetch('/api/config').then((response) => response.json()).then(setConfig).catch(() => {})
  }, [])

  const url = (config.publicUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')
  const slide = state?.slides?.[state.slideIndex]

  useSlideKeys(status === 'live' && !qr && !resetOpen, {
    onPrev: () => { if (state && state.slideIndex > 0) void actions.go(state.slideIndex - 1) },
    onNext: () => { if (state && state.slideIndex < state.slides.length - 1) void actions.go(state.slideIndex + 1) },
  })

  if (!state) {
    return (
      <LoadingScreen
        label={status === 'offline' ? 'No hay conexión con la sala' : 'Abriendo el presentador…'}
        action={status === 'offline' ? () => window.location.reload() : null}
      />
    )
  }

  return (
    <ThemeScope design={state.design} global>
      <div className="stage-wrap">
        <div className="stage">
          {status === 'reconnecting' && <div className="reconnect">Reconectando…</div>}
          <SlideView
            mode="present"
            slide={slide}
            slideIndex={state.slideIndex}
            slideCount={state.slides.length}
            results={state.results}
            priceTable={state.priceTable}
            publicUrl={url}
            hosts={config.hosts || []}
            connected={state.connected}
          />
          <ControlDock
            index={state.slideIndex}
            count={state.slides.length}
            showResults={state.showResults}
            connected={state.connected}
            answered={state.answered}
            slide={slide}
            onPrev={() => void actions.go(state.slideIndex - 1)}
            onNext={() => void actions.go(state.slideIndex + 1)}
            onToggleResults={() => void actions.results(!state.showResults)}
            onQr={() => setQr(true)}
            onEdit={onEdit}
            onReset={() => setResetOpen(true)}
          />
        </div>
      </div>
      {qr && <QrOverlay url={url} hosts={config.hosts || []} onClose={() => setQr(false)} />}
      {resetOpen && (
        <Modal
          title="¿Borrar todos los votos?"
          body="Se borran los votos y el servicio elegido. Cada celular va a tener que elegir de nuevo. No se puede deshacer."
          confirmLabel="Borrar votos"
          danger
          onClose={() => setResetOpen(false)}
          onConfirm={async () => {
            await actions.reset()
            setResetOpen(false)
          }}
        />
      )}
    </ThemeScope>
  )
}
