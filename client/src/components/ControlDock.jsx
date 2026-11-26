export function ControlDock({
  index,
  count,
  showResults,
  connected,
  answered,
  slide,
  onPrev,
  onNext,
  onToggleResults,
  onQr,
  onEdit,
  onReset,
}) {
  const collects = ['single', 'multi', 'words'].includes(slide?.type)
  const cost = slide?.type === 'cost' || slide?.role === 'cost'
  const people = `${connected} ${connected === 1 ? 'conectado' : 'conectados'}`
  const answers = `${answered} ${answered === 1 ? 'respuesta' : 'respuestas'}`
  return (
    <div className="dock absolute bottom-2 left-1/2 z-30 flex max-w-[calc(100%-0.75rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto whitespace-nowrap px-1.5 py-1">
      <button type="button" onClick={onPrev} disabled={index <= 0} title="Diapositiva anterior (←)">Anterior</button>
      <span className="px-1 text-sm font-semibold tabular-nums">{String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span>
      <button type="button" onClick={onNext} disabled={index >= count - 1} title="Diapositiva siguiente (→)">Siguiente</button>
      <button type="button" data-on={showResults || cost ? 'true' : 'false'} disabled={!collects || cost} onClick={onToggleResults} title={cost ? 'En esta diapositiva los resultados se ven siempre' : 'Mostrar u ocultar resultados'}>
        {cost ? 'Resultados visibles' : showResults ? 'Ocultar resultados' : 'Mostrar resultados'}
      </button>
      <button type="button" onClick={onQr}>QR</button>
      <button type="button" onClick={onEdit}>Editar</button>
      <button type="button" onClick={onReset}>Reiniciar</button>
      <span className="flex items-center gap-2 px-2 text-sm">
        <span className="h-2 w-2 rounded-full" style={{ background: '#3dd68c' }} />
        {people}
        {collects && <span>· {answers}</span>}
      </span>
    </div>
  )
}
