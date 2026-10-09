import { useSyncExternalStore } from 'react';
import { lookStore, resetLook, setTouchLook, zoomBy } from '../journey/freeLook';

/**
 * Controles de mirada libre: arrastrar sobre la escena para orbitar; botones para acercar, alejar y volver
 * al plano de la película. En pantallas táctiles, «Mirar» cambia el gesto de deslizar entre recorrer la historia y orbitar.
 */
export function LookControls() {
  const touch = useSyncExternalStore(lookStore.subscribe, lookStore.getTouch, lookStore.getTouch);
  const active = useSyncExternalStore(lookStore.subscribe, lookStore.getActive, lookStore.getActive);
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return (
    <div className="look-controls" role="group" aria-label="Mirar alrededor">
      {coarse && (
        <button type="button" aria-pressed={touch} onClick={() => setTouchLook(!touch)} title="Con «Mirar» activado, deslizar el dedo orbita la escena">
          ✋ Mirar
        </button>
      )}
      <button type="button" onClick={() => zoomBy(0.78)} aria-label="Acercar" title="Acercar">＋</button>
      <button type="button" onClick={() => zoomBy(1.28)} aria-label="Alejar" title="Alejar">－</button>
      <button type="button" onClick={resetLook} disabled={!active} aria-label="Volver al plano de la película" title="Volver al plano de la película (doble clic)">⌖</button>
      {!active && !coarse && <span className="look-hint">arrastrá para mirar alrededor</span>}
    </div>
  );
}
