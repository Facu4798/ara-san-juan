import { useEffect, useRef } from 'react';
import { TRAVESIA_LAYERS, TRAVESIA_RANGE, appStore, setApp, useApp } from '../../app/appStore';
import { CertaintyBadge, SourceRefs } from '../../components/Certainty';
import { COAST_NEAREST_0028 } from '../../data/positions';
import { DIST } from '../../data/distances';
import { fmt0, fmt1, CERTAINTY_ICON } from '../../utils/format';
import { fmtDay, fmtHour, fmtWhen } from '../format';
import { SUB_PARTS, SUB_SPECS, UNPLACED } from './subParts';
import {
  TRAVESIA_EVENTS, PLAY_SECONDS, BREAKS, eventLayers, fromU, toU, subAt, hypothesisAt, currentEvent, T_0028, T_0719, T_1051,
} from './travesiaModel';

/**
 * MÓDULO 2 · Paneles de «La última travesía».
 */

const visibleEvents = (layers: Record<string, boolean>) => TRAVESIA_EVENTS.filter((e) => eventLayers(e).some((l) => layers[l]));

// ——— Reproducción: avanza el tiempo, desacelera cerca de cada acontecimiento y lo selecciona ———
function usePlayer() {
  const playing = useApp((s) => s.travesiaPlaying);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      const s = appStore.get();
      const evs = visibleEvents(s.layers);
      const u = toU(s.travesiaT);
      // Distancia (en la línea) al acontecimiento más cercano: cerca, la marcha se vuelve lenta.
      const near = Math.min(1, ...evs.map((e) => Math.abs(toU(Date.parse(e.datetime)) - u)));
      const slow = 0.22 + 0.78 * Math.min(1, near / 0.015);
      const nu = Math.min(1, u + (dt / PLAY_SECONDS) * s.travesiaSpeed * slow);
      const nt = fromU(nu);
      const crossed = evs.find((e) => {
        const et = Date.parse(e.datetime);
        return et > s.travesiaT && et <= nt;
      });
      setApp({ travesiaT: nt, ...(crossed ? { selectedEventId: crossed.id } : {}), ...(nu >= 1 ? { travesiaPlaying: false } : {}) });
      if (nu < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
}

export function TravesiaTimeline() {
  usePlayer();
  const t = useApp((s) => s.travesiaT);
  const playing = useApp((s) => s.travesiaPlaying);
  const speed = useApp((s) => s.travesiaSpeed);
  const layers = useApp((s) => s.layers);
  const selected = useApp((s) => s.selectedEventId);
  const track = useRef<HTMLDivElement>(null);
  const evs = visibleEvents(layers);

  const seek = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const u = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setApp({ travesiaT: fromU(u), travesiaPlaying: false });
  };
  const jump = (dir: 1 | -1) => {
    const list = dir > 0 ? evs.filter((e) => Date.parse(e.datetime) > t + 1000) : evs.filter((e) => Date.parse(e.datetime) < t - 1000).reverse();
    const e = list[0];
    if (e) setApp({ travesiaT: Date.parse(e.datetime), selectedEventId: e.id, travesiaPlaying: false });
  };

  return (
    <div className="timeline-bar" role="group" aria-label="Línea de tiempo de la travesía">
      <div className="tl-controls">
        <button type="button" onClick={() => jump(-1)} title="Acontecimiento anterior" aria-label="Acontecimiento anterior">⏮</button>
        <button type="button" className="play" onClick={() => setApp({ travesiaPlaying: !playing, ...(t >= TRAVESIA_RANGE[1] ? { travesiaT: TRAVESIA_RANGE[0] } : {}) })} aria-label={playing ? 'Pausar' : 'Reproducir'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" onClick={() => jump(1)} title="Acontecimiento siguiente" aria-label="Acontecimiento siguiente">⏭</button>
        <div className="speed" role="radiogroup" aria-label="Velocidad">
          {([0.5, 1, 2] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={speed === v} onClick={() => setApp({ travesiaSpeed: v })}>
              {String(v).replace('.', ',')}×
            </button>
          ))}
        </div>
        <div className="tl-now">
          <span className="d">{fmtDay(t)}</span> <span className="h">{fmtHour(t)}</span>
        </div>
      </div>
      <div
        className="tl-track"
        data-tour="trav-track"
        ref={track}
        onPointerDown={(e) => { try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* sin captura: el arrastre sigue funcionando */ } seek(e.clientX); }}
        onPointerMove={(e) => { if (e.buttons === 1) seek(e.clientX); }}
        role="slider"
        aria-label="Instante de la travesía"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(toU(t) * 100)}
        aria-valuetext={`${fmtDay(t)} ${fmtHour(t)}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setApp({ travesiaT: fromU(Math.min(1, toU(t) + 0.01)) });
          if (e.key === 'ArrowLeft') setApp({ travesiaT: fromU(Math.max(0, toU(t) - 0.01)) });
        }}
      >
        <div className="seg" style={{ left: 0, width: `${toU(BREAKS[1]) * 100}%` }}><span>25 oct. → 14 nov. · días</span></div>
        <div className="seg alt" style={{ left: `${toU(BREAKS[1]) * 100}%`, right: 0 }}><span>14 → 15 nov. · horas</span></div>
        <div className="tl-progress" style={{ width: `${toU(t) * 100}%` }} />
        {evs.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`tl-ev ${e.certainty}${selected === e.id ? ' on' : ''}${e.sinRespuesta ? ' muted' : ''}`}
            style={{ left: `${toU(Date.parse(e.datetime)) * 100}%` }}
            title={`${fmtWhen(e.datetime, e.precision)} · ${e.titulo}`}
            onPointerDown={(ev) => ev.stopPropagation()}
            onClick={() => setApp({ travesiaT: Date.parse(e.datetime), selectedEventId: e.id, travesiaPlaying: false })}
            aria-label={`${fmtWhen(e.datetime, e.precision)}: ${e.titulo}`}
          >
            <span aria-hidden="true">{CERTAINTY_ICON[e.certainty]}</span>
          </button>
        ))}
        <div className="tl-handle" style={{ left: `${toU(t) * 100}%` }} />
      </div>
      <p className="tl-note">Escala por tramos: las tres semanas de misión ocupan el 30 % de la línea y las últimas 13 horas, el 70 %.</p>
    </div>
  );
}

/** Horas y minutos entre dos instantes (sin redondear a la hora). */
function hhmm(ms: number) {
  const m = Math.round(ms / 60_000);
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

/**
 * Lo que se desprende de los datos de este módulo. Todo se calcula acá a partir de las
 * posiciones y las horas documentadas; ningún número está escrito a mano.
 */
function TravesiaFindings() {
  const conPos = TRAVESIA_EVENTS.filter((e) => e.positionId).length;
  const alcance = hypothesisAt(T_1051)!;
  return (
    <section className="findings">
      <h4>Lo que muestran los datos</h4>
      <ul>
        <li>
          Entre la última posición publicada (00:28) y la última comunicación (07:19) pasaron{' '}
          <strong>{hhmm(T_0719 - T_0028)}</strong> de los que no se conoce ninguna coordenada.
        </li>
        <li>
          De los {TRAVESIA_EVENTS.length} acontecimientos documentados de la travesía, sólo <strong>{conPos}</strong> tienen un
          lugar publicado: puertos y la coordenada de las 00:28.
        </li>
        <li>
          Los restos aparecieron a <strong>{fmt1(DIST.wreck)} km</strong> de esa coordenada, dentro del círculo de{' '}
          {fmt0(alcance.km)} km que el submarino podía alcanzar a 5 nudos en las {hhmm(T_1051 - T_0028)} hasta el evento
          acústico. Es una cota geométrica, no una trayectoria.
        </li>
        <li>
          La coordenada de las 00:28 está en alta mar: <strong>{fmt0(COAST_NEAREST_0028.km)} km</strong> de la costa de{' '}
          {COAST_NEAREST_0028.provincia} y {fmt0(DIST.mdp)} km de su base.
        </li>
      </ul>
      <p className="muted small">
        Cálculos propios (haversine y diferencias horarias) sobre los datos publicados.
        <SourceRefs ids={['infobae2026requerimiento', 'ctbto2017', 'lanacion2018coordenada']} />
      </p>
    </section>
  );
}

export function TravesiaLayers() {
  const layers = useApp((s) => s.layers);
  return (
    <div className="panel-body">
      <h2 className="panel-title">La última travesía</h2>
      <p className="panel-lede">Del zarpe en Mar del Plata (25/10/2017) a la última comunicación. Arrastrá la línea de tiempo o reproducila; tocá el submarino para verlo en 3D.</p>
      <fieldset className="field">
        <legend>Capas del mapa</legend>
        {TRAVESIA_LAYERS.map((l) => (
          <label key={l.id} className="toggle" data-tour={`layer-${l.id}`}>
            <input type="checkbox" checked={layers[l.id]} onChange={(e) => setApp({ layers: { ...layers, [l.id]: e.target.checked } })} />
            <span>
              {l.label}
              <small>{l.note}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <button type="button" className="btn-ghost small block" data-tour="sub3d" onClick={() => setApp({ subInspect: true, selectedPart: null })}>
        Ver el submarino en 3D
      </button>
      <TravesiaFindings />
    </div>
  );
}

function Compass({ heading, label }: { heading: number; label: string }) {
  return (
    <div className="mini-compass">
      <svg viewBox="-30 -36 60 66" width="56" height="62" aria-hidden="true">
        <circle r="24" fill="none" stroke="currentColor" strokeOpacity="0.35" />
        <text y="-27" textAnchor="middle" fontSize="8">N</text>
        <g transform={`rotate(${heading})`}><path d="M0 16 L0 -20 M-4 -13 L0 -20 L4 -13" stroke="#eaf4f8" strokeWidth="1.6" fill="none" /></g>
      </svg>
      <span>{label}</span>
    </div>
  );
}

export function TravesiaDetail() {
  const t = useApp((s) => s.travesiaT);
  const selectedId = useApp((s) => s.selectedEventId);
  const layers = useApp((s) => s.layers);
  const e = TRAVESIA_EVENTS.find((x) => x.id === selectedId) ?? currentEvent(t, visibleEvents(layers));
  const sub = subAt(t);
  const hyp = hypothesisAt(t);
  return (
    <div className="panel-body">
      <section className="state-box">
        <div className="eyebrow">{fmtDay(t)} · {fmtHour(t)}</div>
        <h3>Posición del submarino</h3>
        <p><CertaintyBadge c={sub.certainty} /> {sub.texto}</p>
        {t >= T_0028 && (
          <p className="small">
            Última coordenada: <span className="mono">46°44′ S · 60°08′ O</span>, en alta mar a unos {fmt0(COAST_NEAREST_0028.km)} km de la costa de Santa Cruz y a {fmt0(DIST.mdp)} km de Mar del Plata.
            <SourceRefs ids={['infobae2026requerimiento']} />
          </p>
        )}
        {hyp && (
          <p className="small hyp">
            ◇ Hipótesis de alcance: en {fmt1(hyp.hours)} h a 5 nudos podría haber recorrido hasta {fmt0(hyp.km)} km en cualquier dirección. No es una posición.
          </p>
        )}
      </section>
      {e ? (
        <section className="event-box">
          <div className="eyebrow">{fmtWhen(e.datetime, e.precision)}</div>
          <h3>{e.titulo}</h3>
          <CertaintyBadge c={e.certainty} />
          <p>{e.detalle}</p>
          {e.id === 'c2342' && <Compass heading={80} label="rumbo 080° · posición no publicada" />}
          {e.id === 'c0719' && <Compass heading={15} label="rumbo 015° · posición no publicada" />}
          {e.nota && <p className="muted small">Nota: {e.nota}</p>}
          <p className="small"><SourceRefs ids={e.sourceIds} /></p>
          <button type="button" className="btn-ghost small" onClick={() => setApp({ evidenceEventId: e.id })}>Ver evidencia documental</button>
        </section>
      ) : (
        <p className="muted">Elegí un acontecimiento en la línea de tiempo.</p>
      )}
    </div>
  );
}

// ——— Inspección del submarino ———

export function SubInspectorPanel() {
  return (
    <div className="panel-body">
      <button type="button" className="link back" onClick={() => setApp({ subInspect: false, selectedPart: null })}>← volver al mapa</button>
      <h2 className="panel-title">ARA San Juan (S-42)</h2>
      <p className="panel-lede">Girá, acercate y tocá una parte. Sólo se señalan las partes con información publicada.</p>
      <dl className="specs">
        {SUB_SPECS.map((s) => (
          <div key={s.k}>
            <dt>{s.k}</dt>
            <dd>{s.v} <SourceRefs ids={s.sourceIds} /></dd>
          </div>
        ))}
      </dl>
      <h4>Mencionados en las fuentes, sin ubicación publicada</h4>
      <ul className="unplaced">
        {UNPLACED.map((u) => (
          <li key={u.nombre}>
            <CertaintyBadge c="desconocido" /> <strong>{u.nombre}</strong>: {u.texto} <SourceRefs ids={u.sourceIds} />
          </li>
        ))}
      </ul>
      <p className="muted small">No hay planos del interior con licencia de uso: no se dibuja el interior ni la posición de estos componentes.</p>
    </div>
  );
}

export function SubPartDetail() {
  const id = useApp((s) => s.selectedPart);
  const part = SUB_PARTS.find((p) => p.id === id);
  return (
    <div className="panel-body">
      {part ? (
        <>
          <h3>{part.nombre}</h3>
          <ul className="part-facts">
            {part.datos.map((d, i) => (
              <li key={i}><CertaintyBadge c={d.certainty} /> {d.texto} {d.sourceIds.length > 0 && <SourceRefs ids={d.sourceIds} />}</li>
            ))}
          </ul>
          <button type="button" className="link" onClick={() => setApp({ selectedPart: null })}>quitar selección</button>
        </>
      ) : (
        <p className="muted">Tocá la proa, el casco, la vela o la popa para ver lo que se sabe de cada parte.</p>
      )}
    </div>
  );
}
