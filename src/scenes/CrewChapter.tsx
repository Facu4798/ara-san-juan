import { useEffect, useMemo, useRef, useState } from 'react';
import { crew } from '../data/crew';
import { CrewViz, type CrewMode } from '../visualizations/CrewViz';
import { SourceRefs } from '../components/Certainty';
import { narrateKey, useAudioState } from '../audio/useAudio';
import { fmt0 } from '../utils/format';
import * as d3 from 'd3';

const MODES: { id: CrewMode; label: string }[] = [
  { id: 'casco', label: 'En el casco' },
  { id: 'grado', label: 'Por grado' },
  { id: 'provincia', label: 'Por provincia' },
  { id: 'edad', label: 'Por edad' },
];

const NO_DATA = 'sin dato en las fuentes consultadas';

export function CrewChapter() {
  const [mode, setMode] = useState<CrewMode>('casco');
  const [selected, setSelected] = useState<number | null>(1);
  const c = crew.find((m) => m.orden === selected) ?? null;
  const sectionRef = useRef<HTMLElement | null>(null);
  const { ready } = useAudioState();

  useEffect(() => {
    const el = sectionRef.current;
    if (!ready || !el) return;
    let said = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !said) {
          said = true;
          narrateKey('crew:intro');
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ready]);

  const stats = useMemo(() => {
    const ages = crew.filter((m) => m.edad != null).map((m) => m.edad!);
    return {
      withAge: ages.length,
      median: d3.median(ages) ?? 0,
      min: d3.min(ages) ?? 0,
      max: d3.max(ages) ?? 0,
      withProvince: crew.filter((m) => m.provincia).length,
      provinces: new Set(crew.filter((m) => m.provincia).map((m) => m.provincia)).size,
    };
  }, []);

  return (
    <section id="los44" ref={sectionRef} className="section" aria-labelledby="los44-title">
      <div className="eyebrow">07 · 44</div>
      <h2 id="los44-title">No eran un punto en el mapa</h2>
      <p className="lede">
        43 hombres y una mujer.<SourceRefs ids={['armadaMicrositio2018']} /> Cada marca es una persona de la nómina oficial del
        Decreto 212/2020.<SourceRefs ids={['decreto212']} /> Edad publicada para {stats.withAge} de 44 (entre {stats.min} y {stats.max} años,
        mediana {fmt0(stats.median)}); provincia de origen publicada para {stats.withProvince} de 44, de al menos {stats.provinces} provincias.
        <SourceRefs ids={['infobae2017tripulantes']} />
      </p>

      <div className="crew-controls" role="toolbar" aria-label="Organizar a los tripulantes">
        {MODES.map((m) => (
          <button key={m.id} className="chip" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="crew-stage">
        <CrewViz crew={crew} mode={mode} selected={selected} onSelect={setSelected} />
      </div>

      <div className="crew-card" aria-live="polite">
        {c ? (
          <>
            <h3>{c.nombreCompleto}</h3>
            <dl>
              <dt>Grado</dt>
              <dd>{c.gradoDecreto} <span className="badge hecho">Decreto 212/2020</span></dd>
              {c.gradoPrensa2017 && (
                <>
                  <dt>Grado 2017</dt>
                  <dd>{c.gradoPrensa2017} <span className="muted">(prensa; el decreto lo asciende con fecha 02/01/2018)</span></dd>
                </>
              )}
              <dt>Función</dt>
              <dd>{c.funcion ?? <span className="muted">{NO_DATA}</span>}</dd>
            </dl>
            <dl>
              <dt>Edad</dt>
              <dd>{c.edad != null ? `${c.edad} años` : <span className="muted">{NO_DATA}</span>}</dd>
              <dt>Origen</dt>
              <dd>
                {c.localidad || c.provincia ? (
                  <>
                    {[c.localidad, c.provincia].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                    {c.provinciaInferida && <span className="muted"> (provincia asignada por localidad)</span>}
                  </>
                ) : (
                  <span className="muted">{NO_DATA}</span>
                )}
              </dd>
              <dt>Fuentes</dt>
              <dd><SourceRefs ids={c.fuentesPerfil} /></dd>
            </dl>
          </>
        ) : (
          <p className="muted">Seleccioná una marca.</p>
        )}
      </div>

      <details style={{ marginTop: 28 }}>
        <summary className="eyebrow" style={{ cursor: 'pointer' }}>Nómina completa (texto)</summary>
        <ol className="crew-list">
          {crew.map((m) => (
            <li key={m.orden}>
              {m.gradoDecreto} {m.nombreCompleto}
            </li>
          ))}
        </ol>
      </details>
      <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>
        No se usan fotografías: no se verificaron permisos de uso. No se generaron imágenes. Los datos personales se limitan a nombre,
        grado, edad, origen y función publicados.
      </p>
    </section>
  );
}
