import { beats } from '../story/beats';
import { useStory } from '../story/store';
import { MemorialCover } from './MemorialCover';
import { BeatCard } from './BeatCard';
import { Closing } from './Closing';
import { ActLabel, Clock, Compass, DepthHud, ScaleNote } from './Hud';
import { PresenterBar } from './PresenterBar';
import { ScreenFx } from './ScreenFx';

/**
 * Capa HTML fija sobre la escena 3D: texto, indicadores y controles.
 * Se oculta al pasar al anexo de metodología.
 */
export function Overlay({ status }: { status: 'ok' | 'loading' | 'no-webgl' | 'error' }) {
  const { index, p, inStory } = useStory();
  const beat = beats[index];

  return (
    <div className={`overlay${inStory ? '' : ' hidden'}`}>
      <ScreenFx />
      <ActLabel beat={beat} />
      <Clock beat={beat} p={p} />
      <a className="to-method" href="#metodologia">Metodología</a>

      {beat.layout === 'cover' && <MemorialCover beat={beat} p={p} />}
      {(beat.layout === 'card' || beat.layout === 'caption') && <BeatCard key={beat.id} beat={beat} p={p} />}
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
