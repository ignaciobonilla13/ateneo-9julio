import { useEffect, useRef } from 'react'

export function useSlideKeys(enabled, handlers) {
  const ref = useRef(handlers)
  ref.current = handlers
  useEffect(() => {
    if (!enabled) return undefined
    const onKey = (event) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        ref.current.onNext()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        ref.current.onPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
