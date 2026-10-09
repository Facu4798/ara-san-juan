import { useState } from 'react';
import { crew } from '../data/crew';
import { portraitUrl } from '../data/portraits';
import type { CrewMember } from '../data/types';
import { DIST } from '../data/distances';
import { DAYS_TO_FIND } from '../data/search';
import { WRECK_DEPTH_M } from '../data/depth';
import { SourceRefs } from '../components/Certainty';
import { fmt0 } from '../utils/format';
import type { Beat } from '../story/beats';
import { PersonCard } from './MemorialCover';
import { openModule } from '../app/appStore';

const smooth = (t: number) => t * t * (3 - 2 * t);

/** CIERRE: vuelven las personas. Los 44 nombres, en el orden del decreto, y cuatro cifras. */
export function Closing({ beat, p }: { beat: Beat; p: number }) {
  const [selected, setSelected] = useState<CrewMember | null>(null);
  const a = smooth(Math.min(1, Math.max(0, (p - 0.05) / 0.4)));
  return (
    <section className="closing" style={{ opacity: a, pointerEvents: a > 0.5 ? 'auto' : 'none' }} aria-label="Cierre">
      <div className="eyebrow">{beat.eyebrow}</div>
      <h2>{beat.title}</h2>
      <div className="figures">
        <div><b>44</b><span>tripulantes</span></div>
        <div><b>{DAYS_TO_FIND}</b><span>días sin saber dónde estaban</span></div>
        <div><b>{WRECK_DEPTH_M} m</b><span>de profundidad</span></div>
        <div><b>{fmt0(DIST.wreck)} km</b><span>de la última coordenada</span></div>
      </div>
      <ol className="names">
        {crew.map((c) => (
          <li key={c.orden}>
            <button type="button" onClick={() => setSelected(c)}>
              {portraitUrl(c.orden) && <img src={portraitUrl(c.orden)!} alt="" loading="lazy" />}
              <span>
                <small>{c.gradoDecreto}</small>
                {c.nombreCompleto}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="closing-foot">
        Nómina y grados: Decreto 212/2020 <SourceRefs ids={beat.sourceIds} /> · Retratos: «44 Presentes» <SourceRefs ids={['memorial44']} />
        <br />
        <button type="button" className="btn-primary explore-cta" onClick={() => openModule('vidas')}>Explorar los datos →</button>
        <br />
        <a href="#metodologia">Datos, fuentes y metodología ↓</a>
      </p>
      {selected && <PersonCard c={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
