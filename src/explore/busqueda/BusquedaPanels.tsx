import { useEffect, useRef, useState } from 'react';
import { BUSQUEDA_RANGE, appStore, setApp, useApp } from '../../app/appStore';
import { CertaintyBadge, SourceRefs } from '../../components/Certainty';
import { DIST } from '../../data/distances';
import { DAYS_TO_FIND, searchFacts2017 } from '../../data/search';
import { fmt1 } from '../../utils/format';
import { fmtDay, fmtWhen } from '../format';
import { PERIODS, SEARCH_EVENTS, VESSEL, daysSince, metricsAt, periodSummary, T_INICIO_2018, T_HALLAZGO } from './busquedaModel';

/**
 * MÓDULO 3 · Paneles de «La búsqueda».
 */
const PLAY_SECONDS = 36;

function usePlayer() {
  const playing = useApp((s) => s.busquedaPlaying);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const span = BUSQUEDA_RANGE[1] - BUSQUEDA_RANGE[0];
    const step = (now: number) => {
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      const t = Math.min(BUSQUEDA_RANGE[1], appStore.get().busquedaT + (dt / PLAY_SECONDS) * span);
      setApp({ busquedaT: t, ...(t >= BUSQUEDA_RANGE[1] ? { busquedaPlaying: false } : {}) });
      if (t < BUSQUEDA_RANGE[1]) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
}

export function BusquedaTimeline() {
  usePlayer();
  const t = useApp((s) => s.busquedaT);
  const playing = useApp((s) => s.busquedaPlaying);
  const fase = useApp((s) => s.busquedaFase);
  const track = useRef<HTMLDivElement>(null);
  const span = BUSQUEDA_RANGE[1] - BUSQUEDA_RANGE[0];
  const u = (x: number) => ((x - BUSQUEDA_RANGE[0]) / span) * 100;
  const seek = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    setApp({ busquedaT: BUSQUEDA_RANGE[0] + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * span, busquedaPlaying: false, compare: null });
  };
  const evs = SEARCH_EVENTS.filter((e) => fase === 'todas' || e.fase === fase);
  return (
    <div className="timeline-bar" role="group" aria-label="Línea de tiempo de la búsqueda">
      <div className="tl-controls">
        <button type="button" className="play" aria-label={playing ? 'Pausar' : 'Reproducir'}
          onClick={() => setApp({ busquedaPlaying: !playing, compare: null, ...(t >= BUSQUEDA_RANGE[1] ? { busquedaT: BUSQUEDA_RANGE[0] } : {}) })}>
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="tl-now">
          <span className="d">{fmtDay(t)}</span>
          <span className="h small">{t >= T_HALLAZGO ? `hallado el 17/11/2018, día ${daysSince(T_HALLAZGO)}` : `día ${daysSince(t)} sin el submarino`}</span>
        </div>
      </div>
      <div
        className="tl-track"
        ref={track}
        onPointerDown={(e) => { try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* sin captura: el arrastre sigue funcionando */ } seek(e.clientX); }}
        onPointerMove={(e) => { if (e.buttons === 1) seek(e.clientX); }}
        role="slider"
        aria-label="Fecha de la búsqueda"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(u(t))}
        aria-valuetext={fmtDay(t)}
        tabIndex={0}
        onKeyDown={(e) => {
          const d = 7 * 86_400_000;
          if (e.key === 'ArrowRight') setApp({ busquedaT: Math.min(BUSQUEDA_RANGE[1], t + d) });
          if (e.key === 'ArrowLeft') setApp({ busquedaT: Math.max(BUSQUEDA_RANGE[0], t - d) });
        }}
      >
        <div className="seg" style={{ left: 0, width: `${u(T_INICIO_2018)}%` }}><span>2017–2018 · Armada y cooperación internacional</span></div>
        <div className="seg alt" style={{ left: `${u(T_INICIO_2018)}%`, right: 0 }}><span>2018 · Ocean Infinity</span></div>
        <div className="tl-progress" style={{ width: `${u(t)}%` }} />
        {VESSEL.map((v) => <span key={v.id} className="tl-pos" style={{ left: `${u(v.t)}%` }} />)}
        {evs.map((e) => (
          <button key={e.id} type="button" className={`tl-ev ${e.certainty}`} style={{ left: `${u(Date.parse(e.datetime))}%` }}
            title={`${fmtWhen(e.datetime, e.precision)} · ${e.titulo}`} aria-label={`${fmtWhen(e.datetime, e.precision)}: ${e.titulo}`}
            onPointerDown={(ev) => ev.stopPropagation()}
            onClick={() => setApp({ busquedaT: Date.parse(e.datetime), busquedaPlaying: false, compare: null })}>
            <span aria-hidden="true">✓</span>
          </button>
        ))}
        <div className="tl-handle" style={{ left: `${u(t)}%` }} />
      </div>
      <p className="tl-note">Escala lineal. Marcas finas: partes de la Armada con la posición del buque de búsqueda (2018).</p>
    </div>
  );
}

function PeriodPicker({ value, onChange, label }: { value: string; onChange: (id: string) => void; label: string }) {
  return (
    <label className="field inline">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
    </label>
  );
}

export function BusquedaControls() {
  const fase = useApp((s) => s.busquedaFase);
  const compare = useApp((s) => s.compare);
  const [a, setA] = useState('nov17');
  const [b, setB] = useState('sep18');
  const range = (id: string) => PERIODS.find((p) => p.id === id)!.range;
  const apply = (na: string, nb: string) => setApp({ compare: { a: range(na), b: range(nb) }, busquedaPlaying: false });

  return (
    <div className="panel-body">
      <h2 className="panel-title">La búsqueda</h2>
      <p className="panel-lede">367 días entre la última comunicación y el hallazgo. Mové la fecha o compará dos períodos.</p>

      <fieldset className="field">
        <legend>Fase</legend>
        <div className="segmented">
          {([['todas', 'Todas'], ['2017', 'Armada (2017–18)'], ['2018', 'Ocean Infinity (2018)']] as const).map(([id, l]) => (
            <button key={id} type="button" aria-pressed={fase === id} onClick={() => setApp({ busquedaFase: id })}>{l}</button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>Comparar dos períodos</legend>
        <PeriodPicker label="Período A (celeste)" value={a} onChange={(v) => { setA(v); if (compare) apply(v, b); }} />
        <PeriodPicker label="Período B (blanco)" value={b} onChange={(v) => { setB(v); if (compare) apply(a, v); }} />
        {compare ? (
          <button type="button" className="btn-ghost small" onClick={() => setApp({ compare: null })}>Salir de la comparación</button>
        ) : (
          <button type="button" className="btn-ghost small" onClick={() => apply(a, b)}>Comparar</button>
        )}
        {compare && <CompareTable a={compare.a} b={compare.b} />}
      </fieldset>

      <div className="notice">
        <CertaintyBadge c="desconocido" /> La Armada no publicó zonas, polígonos ni recorridos de la búsqueda de 2017, ni la superficie relevada en 2018. No se dibujan ni se estiman.
        <SourceRefs ids={['armadaMicrositio2018', 'armadaPartes2018']} />
      </div>
      <BusquedaFindings />
    </div>
  );
}

/**
 * Lo que se desprende de los datos de la búsqueda. Los números se calculan acá a partir de los
 * partes recuperados y de las cifras agregadas con fuente: el hueco documental es, en sí, un dato.
 */
function BusquedaFindings() {
  const primerDia = daysSince(VESSEL[0].t);
  const contactos = searchFacts2017.find((f) => f.id === 'contactos')!;
  // Fechas distintas con posición y número del parte más alto recuperado: miden la cobertura documental.
  const fechas = new Set(VESSEL.map((v) => fmtDay(v.t))).size;
  const ultimoParte = Math.max(...VESSEL.map((v) => Number(v.id.replace('seco-', ''))));
  return (
    <section className="findings">
      <h4>Lo que muestran los datos</h4>
      <ul>
        <li>
          La búsqueda duró <strong>{DAYS_TO_FIND} días</strong>. La primera posición publicada de un buque de búsqueda es
          del día <strong>{primerDia}</strong> ({fmtDay(VESSEL[0].t)}): en los {primerDia} días anteriores no hay ninguna
          coordenada publicada de ninguna unidad de búsqueda.
        </li>
        <li>
          Hay <strong>{VESSEL.length} posiciones</strong> con coordenada, todas de 2018 y repartidas en {fechas} fechas: los
          partes recuperados llegan hasta el N.º {ultimoParte}, así que no cubren toda la campaña. Marcan dónde estaba el
          buque, no qué superficie se relevó.
        </li>
        <li>
          Se investigaron <strong>{contactos.valor} contactos</strong> en los primeros 120 días y ninguno era el submarino.
        </li>
        <li>
          El hallazgo quedó a <strong>{fmt1(DIST.wreckCtbto)} km</strong> de la estimación acústica difundida en 2017 y a{' '}
          {fmt1(DIST.wreck)} km de la última coordenada: los dos datos espaciales disponibles desde el primer día.
        </li>
      </ul>
      <p className="muted small">
        Conteos y distancias: cálculo propio sobre los partes y las coordenadas publicadas.
        <SourceRefs ids={['armadaPartes2018', 'armadaMicrositio2018', 'ctbto2017', 'lanacion2018coordenada']} />
      </p>
    </section>
  );
}

function CompareTable({ a, b }: { a: [number, number]; b: [number, number] }) {
  const A = periodSummary(a);
  const B = periodSummary(b);
  const row = (label: string, va: string | number, vb: string | number) => (
    <tr><th scope="row">{label}</th><td>{va}</td><td>{vb}</td></tr>
  );
  return (
    <table className="compare">
      <thead><tr><th /><th className="a">A</th><th className="b">B</th></tr></thead>
      <tbody>
        {row('Días desde la última comunicación (al inicio)', A.diasDesde, B.diasDesde)}
        {row('Acontecimientos documentados', A.eventos.length, B.eventos.length)}
        {row('Posiciones del buque publicadas', A.posiciones.length || 'ninguna', B.posiciones.length || 'ninguna')}
      </tbody>
      <caption className="muted small">Sólo conteos que los datos permiten. Sin datos espaciales de 2017.</caption>
    </table>
  );
}

export function BusquedaDetail() {
  const t = useApp((s) => s.busquedaT);
  const fase = useApp((s) => s.busquedaFase);
  const metrics = metricsAt(t).filter((m) => fase === 'todas' || m.fase === 'ambas' || m.fase === fase);
  const evs = SEARCH_EVENTS.filter((e) => Date.parse(e.datetime) <= t && (fase === 'todas' || e.fase === fase)).reverse();
  return (
    <div className="panel-body">
      <div className="eyebrow">Al {fmtDay(t)}</div>
      <h3>Métricas documentadas</h3>
      <ul className="metrics">
        {metrics.map((m) => (
          <li key={m.id}>
            <details>
              <summary><strong>{m.valor}</strong> {m.label}</summary>
              <p className="small">{m.definicion} <SourceRefs ids={m.sourceIds} /></p>
            </details>
          </li>
        ))}
      </ul>
      <h3>Acontecimientos hasta esta fecha</h3>
      <ul className="ev-list">
        {evs.map((e) => (
          <li key={e.id}>
            <div className="eyebrow">{fmtWhen(e.datetime, e.precision)}</div>
            <strong>{e.titulo}</strong>
            <p className="small">{e.detalle}</p>
            <button type="button" className="link" onClick={() => setApp({ evidenceEventId: e.id })}>evidencia</button>
          </li>
        ))}
        {!evs.length && <li className="muted">Todavía no hay acontecimientos en esta fase.</li>}
      </ul>
    </div>
  );
}
