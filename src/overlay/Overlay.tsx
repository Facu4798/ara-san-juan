import { useEffect, useRef, useState } from 'react';
import { beats } from '../story/beats';
import { useStory } from '../story/store';
import { MemorialCover } from './MemorialCover';
import { BeatCard } from './BeatCard';
import { Closing } from './Closing';
import { ActLabel, Clock, Compass, DepthHud, ScaleNote } from './Hud';
import { PresenterBar } from './PresenterBar';

/**
 * Capa HTML fija sobre la escena 3D: texto, indicadores y controles.
 * Se oculta al pasar al anexo de metodología.
 */
export function Overlay({ status }: { status: 'ok' | 'loading' | 'no-webgl' | 'error' }) {
  const { index, p, inStory } = useStory();
  const beat = beats[index];

  // Fundido al cambiar de «mundo» (mapa ↔ profundidad ↔ concepto): cubre el corte de cámara.
  const [fadeKey, setFadeKey] = useState(0);
  const lastWorld = useRef(beat.world);
  useEffect(() => {
    if (lastWorld.current !== beat.world) {
      lastWorld.current = beat.world;
      setFadeKey((k) => k + 1);
    }
  }, [beat.world]);

  return (
    <div className={`overlay world-${beat.world}${inStory ? '' : ' hidden'}`}>
      {fadeKey > 0 && <div key={fadeKey} className="curtain" aria-hidden="true" />}

      <ActLabel beat={beat} />
      <Clock beat={beat} p={p} />
      <a className="to-method" href="#metodologia">Metodología</a>

      {beat.layout === 'cover' && <MemorialCover beat={beat} p={p} />}
      {beat.layout === 'card' && <BeatCard key={beat.id} beat={beat} p={p} />}
      {beat.layout === 'closing' && <Closing beat={beat} p={p} />}

      <Compass beat={beat} />
      <DepthHud beat={beat} p={p} />
      <ScaleNote beat={beat} p={p} />

      {status === 'loading' && <p className="status">Cargando costa y batimetría…</p>}
      {status === 'error' && <p className="status">No se pudieron cargar los datos geográficos. Los textos y las fuentes siguen disponibles.</p>}
      {status === 'no-webgl' && (
        <p className="status">
          Este navegador no tiene WebGL: la experiencia es 3D y no puede mostrarse. Los textos, las fuentes y la metodología siguen disponibles.
        </p>
      )}

      <PresenterBar />
    </div>
  );
}
