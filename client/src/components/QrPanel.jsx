import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'

function isLocal(url) {
  try {
    return ['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  } catch {
    return false
  }
}

export function QrCard({ url, hosts = [], size = 280 }) {
  const port = window.location.port
  const suggested = hosts[0] ? `http://${hosts[0]}${port ? `:${port}` : ''}/sala` : ''
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-[1.6rem] bg-white p-4">
        <QRCodeSVG value={url || 'https://ateneo.local'} size={size} level="H" bgColor="#ffffff" fgColor="#0e8a78" />
      </div>
      <p className="mt-4 max-w-md break-all text-center text-lg">{url}</p>
      {url && isLocal(url) && suggested && (
        <p className="mt-3 max-w-md text-center text-sm" style={{ color: 'var(--accent2)' }}>
          Los celulares no abren localhost. Entrá desde {suggested} para que este QR les sirva.
        </p>
      )}
    </div>
  )
}

export function QrOverlay({ url, hosts, onClose }) {
  const [size, setSize] = useState(320)
  useEffect(() => {
    const measure = () => setSize(Math.max(220, Math.min(520, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.58))))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black px-6" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()}>
        <QrCard url={url} hosts={hosts} size={size} />
        <button type="button" className="mt-6 w-full rounded-full py-3 font-semibold" style={{ background: 'var(--card)' }} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}
