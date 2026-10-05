import { useEffect, useRef, type CSSProperties } from 'react';
import { StoryMap, type MapLayers } from '../visualizations/StoryMap';
import { storySteps, SILENCE_START, type BBox } from './storySteps';
import { useScrollSection, useSize } from '../utils/useScrollSection';
import type { GeoData } from '../utils/loadData';
import { CertaintyBadge, SourceRefs } from '../components/Certainty';
import { fmtDate, fmtTime, fmtDuration, fmt0 } from '../utils/format';
import { POS_0028 } from '../data/positions';
import { useStepNarration, useAudioState, effect, setDepth, silenceAll, resumeAmbient } from '../audio/useAudio';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const DAY = 86400000;

export function MapChapter({ geo }: { geo: GeoData | null }) {
  const n = storySteps.length;
  const { ref, step, stepProgress } = useScrollSection(n);
  const { ref: stageRef, width, height } = useSize<HTMLDivElement>();

  const cur = storySteps[step];
  const nxt = storySteps[Math.min(step + 1, n - 1)];
  const e = smooth(0.62, 1, stepProgress);
  const bbox = cur.map.bbox.map((v, i) => lerp(v, nxt.map.bbox[i], e)) as BBox;

  const m = cur.map;
  const hypothesisHours = m.hypothesisHours ? lerp(m.hypothesisHours[0], m.hypothesisHours[1], stepProgress) : undefined;
  const days = m.counterDays ? lerp(m.counterDays[0], m.counterDays[1], stepProgress) : undefined;
  const secoRange: [number, number] | undefined = m.secoRange
    ? [Date.parse(m.secoRange[0]), lerp(Date.parse(m.secoRange[1]), Date.parse(m.secoRange[2]), stepProgress)]
    : undefined;

  let clockMs: number | undefined = m.clock ? Date.parse(m.clock) : undefined;
  if (days != null) clockMs = Date.parse('2017-11-15T10:51:00-03:00') + days * DAY;
  if (secoRange && !m.clock) clockMs = secoRange[1];

  // ——— Sonido: la narración y el ambiente siguen al paso activo ———
  useStepNarration(`map:${cur.id}`);
  const { speaking, ready } = useAudioState();
  const wasSpeaking = useRef(false);
  const lastStep = useRef(-1);

  useEffect(() => {
    if (!ready || lastStep.current === step) return;
    lastStep.current = step;
    const id = cur.id;
    if (id === 'silencio') {
      silenceAll();
    } else if (id === 'ctbto') {
      // El corte llega cuando termina la frase: primero se escucha, después nada.
      setDepth(30);
    } else {
      resumeAmbient();
      setDepth(id === 'hallazgo' ? 907 : 30);
      if (id === 'seco' || id === 'poi24') effect('ping');
      if (id === 'hallazgo') effect('reveal');
    }
  }, [step, cur.id, ready]);

  // Silencio absoluto al terminar la frase de las 10:51.
  useEffect(() => {
    if (cur.id === 'ctbto' && wasSpeaking.current && !speaking) silenceAll();
    wasSpeaking.current = speaking;
  }, [speaking, cur.id]);

  // Ping de sonar repetido mientras se recorre el fondo.
  useEffect(() => {
    if (!ready || cur.id !== 'seco') return;
    const i = window.setInterval(() => effect('ping'), 3600);
    return () => window.clearInterval(i);
  }, [cur.id, ready]);

  const layers: MapLayers = {
    refs: m.refs,
    p0028: m.p0028,
    ctbto: m.ctbto,
    hypothesisHours,
    secoRange,
    secoHighlight: m.secoHighlight,
    wreck: m.wreck,
    distances: m.distances,
    dim: m.dim,
    headingDeg: m.headingDeg,
  };

  const t0028 = Date.parse(POS_0028.datetime!);
  const tSilence = Date.parse(SILENCE_START);
  const showSince = clockMs != null && clockMs > t0028 && !m.wreck;
  const dayNumber = clockMs != null ? Math.floor((clockMs - Date.parse('2017-11-15T00:00:00-03:00')) / DAY) : 0;

  return (
    <section id="viaje" ref={ref} className="scrolly" style={{ height: `${n * 115}vh` }} aria-label="Capítulos 1 a 5: del viaje al hallazgo">
      <div className="scrolly-sticky" ref={stageRef}>
        <div className="chapter-label">{cur.chapter}</div>
        {geo && width > 0 && (
          <StoryMap
            geo={geo}
            bbox={bbox}
            width={width}
            height={height}
            layers={layers}
            title={`Mapa del Atlántico Sur. ${cur.eyebrow}: ${cur.title}`}
          />
        )}
        {!geo && <p className="muted" style={{ position: 'absolute', top: '50%', width: '100%', textAlign: 'center' }}>Cargando costa y batimetría…</p>}

        {clockMs != null && (
          <div className="map-clock" aria-hidden="true">
            <div className="d">{fmtDate(new Date(clockMs).toISOString())}</div>
            {m.clockPrecision !== 'dia' && <div className="t">{fmtTime(new Date(clockMs).toISOString())}</div>}
            {days != null && <div className="t">día {fmt0(dayNumber)}</div>}
            {showSince && clockMs > tSilence && days == null && !secoRange && (
              <div className="since">sin comunicación hace {fmtDuration(clockMs - tSilence)}</div>
            )}
            {showSince && (
              <div className="since" style={{ color: 'var(--muted)' }}>
                última coordenada hace {days != null || secoRange ? `${fmt0(Math.floor((clockMs - t0028) / DAY))} días` : fmtDuration(clockMs - t0028)}
              </div>
            )}
          </div>
        )}

        <div className="map-legend" aria-hidden="true">
          <span>posición documentada <i className="glyph hecho" /></span>
          <span>estimación <i className="glyph estimacion" /></span>
          <span>hipótesis <i className="glyph hipotesis" /></span>
          <span>buque de búsqueda <i style={{ width: 9, height: 9, background: 'var(--busqueda)', display: 'inline-block' }} /></span>
          <span>isóbatas GEBCO 2020 <i style={{ width: 16, height: 1, background: 'var(--estimacion)', display: 'inline-block', opacity: 0.6 }} /></span>
        </div>

        <div className="scrolly-steps">
          {storySteps.map((s, i) => (
            <article
              key={s.id}
              className="step-card"
              aria-hidden={i !== step}
              style={{ opacity: i === step ? 1 : 0, '--dy': `${(i - step) * 24}px`, visibility: Math.abs(i - step) > 1 ? 'hidden' : 'visible' } as CSSProperties}
            >
              <div className="eyebrow">{s.eyebrow}</div>
              <h3>{s.title}</h3>
              {s.big && <div className="big">{s.big}</div>}
              {s.body.map((b, j) => (
                <p key={j}>{b}</p>
              ))}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {s.certainty && <CertaintyBadge c={s.certainty} />}
                <SourceRefs ids={s.sourceIds} />
              </div>
              {s.note && <p className="note">{s.note}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
