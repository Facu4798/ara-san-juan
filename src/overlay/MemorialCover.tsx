import { useEffect, useState, type CSSProperties } from 'react';
import { crew } from '../data/crew';
import { portraitUrl } from '../data/portraits';
import type { CrewMember } from '../data/types';
import { SourceRefs, CertaintyLegend } from '../components/Certainty';
import { play, next } from '../story/store';
import { start } from '../audio/engine';
import type { Beat } from '../story/beats';
import { openModule } from '../app/appStore';
import { startTour } from '../tour/director';
import { preloadVoiceFiles } from '../tour/voice';

const NO_DATA = 'sin dato en las fuentes consultadas';
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * APERTURA: la historia empieza por las personas. Mosaico con los 44 retratos oficiales en el
 * orden del Decreto 212/2020; cada retrato abre la ficha documentada de esa persona.
 */
export function MemorialCover({ beat, p }: { beat: Beat; p: number }) {
  const [selected, setSelected] = useState<CrewMember | null>(null);
  // La portada se desvanece al final del momento y deja ver las 44 luces sobre el mar.
  const fade = 1 - smooth(Math.min(1, Math.max(0, (p - 0.62) / 0.36)));

  useEffect(() => {
    if (fade < 0.2) setSelected(null);
  }, [fade]);

  return (
    <section className="cover" style={{ opacity: fade, pointerEvents: fade > 0.3 ? 'auto' : 'none' }} aria-label="Portada">
      <div className="cover-head">
        <div className="eyebrow">{beat.eyebrow}</div>
        <h1>{beat.title}</h1>
        <p className="cover-sub">{beat.lines[0].text}</p>
      </div>

      <ul className="mosaic" aria-label="Los 44 tripulantes">
        {crew.map((c, i) => {
          const url = portraitUrl(c.orden);
          return (
            <li key={c.orden} style={{ '--i': i } as CSSProperties}>
              <button
                type="button"
                className="portrait"
                aria-pressed={selected?.orden === c.orden}
                onClick={() => setSelected(selected?.orden === c.orden ? null : c)}
                title={`${c.gradoDecreto} ${c.nombreCompleto}`}
              >
                {url ? <img src={url} alt="" loading={i < 22 ? 'eager' : 'lazy'} /> : <span className="initials">{c.nombreCompleto[0]}</span>}
                <span className="portrait-name">{c.nombreCompleto}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="cover-actions">
        <button type="button" className="btn-primary" onClick={() => { void start(); play(); }}>
          ▶ Ver la película · 1 min 10 s
        </button>
        <button type="button" className="btn-ghost tour-cta" onPointerEnter={preloadVoiceFiles} onClick={() => startTour()}>
          ▶ Tour de 1 minuto
        </button>
        <button type="button" className="btn-ghost" onClick={() => { void start(); next(); }}>
          Recorrer a mi ritmo ↓
        </button>
        <button type="button" className="btn-ghost" onClick={() => { void start(); openModule('vidas'); }}>
          Explorar los datos
        </button>
      </div>
      <p className="cover-hint">Mejor con auriculares. Arrastrá para mirar alrededor, tocá la línea de tiempo para saltar a cualquier hecho. Cada retrato abre su ficha.</p>

      <div className="cover-foot">
        <CertaintyLegend />
        <p className="cover-note">
          {beat.note} <SourceRefs ids={beat.sourceIds} />
        </p>
      </div>

      {selected && <PersonCard c={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

/** Ficha documentada de una persona: sólo lo publicado, con su fuente. */
export function PersonCard({ c, onClose }: { c: CrewMember; onClose: () => void }) {
  const url = portraitUrl(c.orden);
  const origen = [c.localidad, c.provincia].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
  return (
    <div className="person-card" role="dialog" aria-label={c.nombreCompleto}>
      <button type="button" className="close" onClick={onClose} aria-label="Cerrar">×</button>
      {url && <img src={url} alt={`Retrato de ${c.nombreCompleto}`} />}
      <div>
        <h3>{c.nombreCompleto}</h3>
        <dl>
          <dt>Grado</dt>
          <dd>{c.gradoDecreto} <span className="muted">(Decreto 212/2020)</span></dd>
          {c.gradoPrensa2017 && (
            <>
              <dt>En 2017</dt>
              <dd>{c.gradoPrensa2017} <span className="muted">(prensa)</span></dd>
            </>
          )}
          <dt>Función</dt>
          <dd>{c.funcion ?? <span className="muted">{NO_DATA}</span>}</dd>
          <dt>Edad</dt>
          <dd>{c.edad != null ? `${c.edad} años` : <span className="muted">{NO_DATA}</span>}</dd>
          <dt>Origen</dt>
          <dd>
            {origen || <span className="muted">{NO_DATA}</span>}
            {c.provinciaInferida && <span className="muted"> (provincia asignada por localidad)</span>}
          </dd>
          <dt>Fuentes</dt>
          <dd><SourceRefs ids={[...c.fuentesPerfil, 'memorial44']} /></dd>
        </dl>
      </div>
    </div>
  );
}
