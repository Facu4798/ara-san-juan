import { useEffect, useState } from 'react';
import { ACTS, type Beat } from '../story/beats';
import { RAIL_MARKS, NO_DATA_BAND } from '../story/descent';
import { VOYAGE_LABEL, voyageStop } from '../data/route';
import { WRECK_DEPTH_M } from '../data/depth';
import { obeliscos } from '../data/landmarks';
import { absolutePressureAtm, kgfPerCm2 } from '../utils/physics';
import { fmt0, fmt1 } from '../utils/format';
import { live } from '../journey/live';
import { subAt } from '../journey/subPath';
import { T } from '../journey/timeline';
import { wobble } from '../journey/track';
import { storyStore, useStory } from '../story/store';
import { cameraAt, symbolScale, trueScaleAt } from '../journey/camera';

/** Etapa actual (arriba a la izquierda). */
export function ActLabel({ beat }: { beat: Beat }) {
  const a = ACTS.find((x) => x.id === beat.act)!;
  return (
    <div className="act-label">
      <span className="num">{a.num}</span> {a.label}
    </div>
  );
}

/**
 * Reloj documentado (arriba a la derecha). Nunca interpola horas: sólo muestra las que
 * figuran en las fuentes; durante el viaje muestra los tramos de fechas documentadas.
 */
export function Clock({ beat, p }: { beat: Beat; p: number }) {
  let fecha = beat.clock?.fecha;
  let hora = beat.clock?.hora;
  let extra: string | null = null;
  if (beat.id === 'viaje') {
    fecha = VOYAGE_LABEL[voyageStop(p)].fecha;
    hora = undefined;
  }
  if (beat.id === 'silencio') {
    fecha = '15 nov. 2017';
    hora = p < 0.42 ? '08:27' : '09:35';
    const min = hora === '08:27' ? 68 : 136;
    extra = `sin comunicación hace ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
  }
  if (beat.id === 'colapso') {
    extra = 'evento acústico registrado a miles de km';
  }
  if (!fecha) return null;
  return (
    <div className="clock" aria-hidden="true">
      <div className="d">{fecha}</div>
      {hora && <div className="t">{hora}</div>}
      {extra && <div className="since">{extra}</div>}
    </div>
  );
}

/** Escala de la vista actual: se declara siempre (exageración, escala real o concepto). */
export function ScaleNote({ beat, p }: { beat: Beat; p: number }) {
  if ((beat.id === 'memorial' && p < 0.7) || beat.layout === 'closing') return null;
  const dist = cameraAt(storyStore.get().t).dist;
  const k = trueScaleAt(dist);
  const enlarged = symbolScale(dist) > 0.0012;
  let text: string;
  if (beat.id === 'colapso') text = 'Representación conceptual · no reproduce el hecho';
  else if (beat.id === 'descenso') text = 'Reconstrucción · escala real 1:1 · fondo GEBCO 2020 del sitio · submarino esquemático';
  else if (beat.id === 'hallazgo') text = 'Escala real 1:1 · fondo GEBCO 2020 del sitio';
  else if (beat.id === 'memorial') text = 'Las 44 luces: una por persona';
  else if (!enlarged) text = 'Escala real 1:1 · submarino esquemático';
  else if (k > 0.85) text = 'El submarino se agranda para verse: no está a escala · esquemático';
  else text = 'Mapa 3D · relieve GEBCO 2020 exagerado ×25 en el mar y ×8 en tierra · el submarino se agranda para verse: no está a escala';
  return <div className="scale-note">{text}</div>;
}

/** Brújula: rumbo documentado cuando no hay posición publicada. */
export function Compass({ beat }: { beat: Beat }) {
  const heading = beat.id === 'c2342' ? 80 : beat.id === 'c0719' ? 15 : null;
  if (heading == null) return null;
  return (
    <div className="compass" aria-label={`Rumbo documentado ${heading} grados; posición no publicada`}>
      <svg viewBox="-34 -40 68 74" width="68" height="74" aria-hidden="true">
        <circle r="26" fill="none" stroke="currentColor" strokeOpacity="0.35" />
        <text y="-30" textAnchor="middle" fontSize="9">N</text>
        <g transform={`rotate(${heading})`}>
          <path d="M0 18 L0 -22 M-5 -14 L0 -22 L5 -14" stroke="var(--hecho)" strokeWidth="1.6" fill="none" />
        </g>
      </svg>
      <div>
        rumbo {String(heading).padStart(3, '0')}°
        <br />
        <span className="muted">posición no publicada</span>
      </div>
    </div>
  );
}

const RAIL_MAX = WRECK_DEPTH_M;
/** Separación mínima entre rótulos del carril (px). */
const GAP = 36;

function useViewportHeight() {
  const [h, setH] = useState(() => window.innerHeight);
  useEffect(() => {
    const on = () => setH(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return h;
}

const ATM_MAX = 100;
/** Ángulo de la aguja (grados) para una presión en atm: arco de 240° con el cero abajo a la izquierda. */
const needle = (atm: number) => -120 + (Math.min(atm, ATM_MAX) / ATM_MAX) * 240;
const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
};
const arc = (r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

/**
 * Manómetro analógico. La aguja marca la presión absoluta que corresponde a la profundidad
 * (cálculo propio, P = P_atm + ρ·g·h). Por debajo del límite preventivo (100 m) no hay ningún dato
 * publicado de la profundidad del submarino: ahí se pinta la BANDA de lo posible (de 11 a 91 atm) en
 * vez de un número, y la aguja tiembla más cuanto más tensa es la escena (puesta en escena, no medición).
 */
export function PressureGauge({ depthM, stress, unknown, t }: { depthM: number; stress: number; unknown: boolean; t: number }) {
  const atm = absolutePressureAtm(depthM);
  const lo = absolutePressureAtm(NO_DATA_BAND.from);
  const hi = absolutePressureAtm(NO_DATA_BAND.to);
  const ang = needle(atm) + wobble(t * 11, 2) * stress * 5;
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);
  return (
    <svg className="gauge" viewBox="-60 -60 120 120" width="96" height="96" role="img" aria-label={`Manómetro: presión aproximada ${fmt0(atm)} atmósferas`}>
      <circle r="56" fill="rgba(8,30,50,0.72)" stroke="rgba(234,244,248,0.22)" />
      <path d={arc(46, needle(lo), needle(hi))} stroke="var(--hipotesis)" strokeWidth="6" fill="none" opacity={unknown ? 0.85 : 0.35} strokeDasharray="2 2.5" />
      <path d={arc(46, -120, 120)} stroke="rgba(234,244,248,0.35)" strokeWidth="1" fill="none" />
      {ticks.map((v) => {
        const [x0, y0] = polar(42, needle(v));
        const [x1, y1] = polar(v % 50 === 0 ? 36 : 39, needle(v));
        return <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} stroke="rgba(234,244,248,0.6)" strokeWidth={v % 50 === 0 ? 1.4 : 0.8} />;
      })}
      {[0, 50, 100].map((v) => {
        const [x, y] = polar(29, needle(v));
        return <text key={v} x={x} y={y + 3} fontSize="8" textAnchor="middle" fill="var(--muted)">{v}</text>;
      })}
      <g transform={`rotate(${ang})`}>
        <line x1="0" y1="6" x2="0" y2="-40" stroke={unknown ? 'var(--hipotesis)' : 'var(--ink)'} strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <circle r="3.2" fill="var(--ink)" />
      <text y="22" fontSize="7.5" textAnchor="middle" fill="var(--muted)" letterSpacing="1.2">ATM</text>
    </svg>
  );
}

/**
 * Profundidad + presión + equivalencia, y el carril que une profundidad, hora y hecho.
 * La posición de cada marca en el carril es proporcional a la profundidad real; los rótulos
 * se reparten para no superponerse y una línea guía los une con su profundidad.
 * El tramo de 100 a 907 m va rayado: no hay ningún dato publicado sobre el submarino ahí.
 * La profundidad sale del mismo submarino que se ve en la escena (journey/subPath.ts).
 */
export function DepthHud({ beat }: { beat: Beat; p: number }) {
  const vh = useViewportHeight();
  const { t } = useStory();
  const show = (t >= T.descenso - 0.5 && t < T.colapso) || beat.id === 'hallazgo';
  if (!show) return null;
  const sub = subAt(t);
  const atFind = beat.id === 'hallazgo';
  // Cerca del colapso la profundidad deja de mostrarse como número: no se publicó a cuál ocurrió.
  const hidden = t >= T.colapso - 2.2;
  const d = atFind ? WRECK_DEPTH_M : sub.depthM;
  const unknown = !atFind && d > NO_DATA_BAND.from + 1;
  const stress = live.env?.stress ?? 0;
  const railH = Math.max(260, (vh - 58) * 0.6);
  const yOf = (m: number) => (m / RAIL_MAX) * railH;

  // Reparto de rótulos de arriba hacia abajo.
  let last = -Infinity;
  const marks = RAIL_MARKS.map((m) => {
    const y = yOf(m.depthM);
    const ly = Math.max(y, last + GAP);
    last = ly;
    return { ...m, y, ly };
  });
  // El aviso «sin datos» va en el hueco más grande dentro de la franja 100–907 m.
  const inBand = marks.filter((m) => m.depthM >= NO_DATA_BAND.from && m.depthM <= NO_DATA_BAND.to);
  let gapTop = 0;
  let gapSize = 0;
  for (let i = 1; i < inBand.length; i++) {
    const size = inBand[i].ly - inBand[i - 1].ly;
    if (size > gapSize) {
      gapSize = size;
      gapTop = inBand[i - 1].ly;
    }
  }
  const bandLabelY = gapTop + gapSize / 2;
  const passed = marks.filter((m) => d >= m.depthM - 0.5);
  const current = passed[passed.length - 1];

  return (
    <div className="depth-hud">
      {!atFind && (
        <div className="readout">
          <div className="readout-main">
            <PressureGauge depthM={hidden ? NO_DATA_BAND.to * 0.8 : d} stress={stress} unknown={unknown || hidden} t={t} />
            <div>
              <span className="depth">{hidden ? '—' : fmt0(d)}</span>
              <span className="unit">m</span>
            </div>
          </div>
          <div className="pressure">
            {hidden ? 'entre 11 y 91 atm · profundidad no publicada' : `≈ ${fmt1(absolutePressureAtm(d))} atm · ${fmt0(kgfPerCm2(d))} kg/cm²`}
          </div>
          {!hidden && <div className="obel">= {fmt1(obeliscos(d))} Obeliscos apilados</div>}
          <div className="calc">presión y equivalencia: cálculo propio · descenso ilustrativo</div>
          {current && !hidden && (
            <div className={`rail-compact ${current.kind}`}>
              {d > NO_DATA_BAND.from + 1 && d < NO_DATA_BAND.to - 1 && current.kind !== 'referencia'
                ? 'sin datos: no se sabe cuándo ni cómo descendió'
                : `${current.label}${current.when ? ` · ${current.when}` : ''} · ${current.detail}`}
            </div>
          )}
        </div>
      )}
      <div className="rail" style={{ height: railH }} aria-label="Profundidades documentadas y referencias de altura">
        <div className="band" style={{ top: yOf(NO_DATA_BAND.from), height: yOf(NO_DATA_BAND.to) - yOf(NO_DATA_BAND.from) }} />
        <div className="band-label" style={{ top: bandLabelY }}>sin datos: no se sabe cuándo ni cómo descendió</div>
        <svg className="leaders" width="26" height={railH + GAP * 2} aria-hidden="true">
          {marks.map((m) => (
            <line key={m.depthM} x1="26" y1={m.y} x2="4" y2={m.ly} />
          ))}
        </svg>
        {marks.map((m) => (
          <div key={m.depthM} className={`mark ${m.kind}${d >= m.depthM - 0.5 ? ' passed' : ''}`} style={{ top: m.ly }}>
            <span className="lbl-depth">
              {m.label}
              {m.when && <b> · {m.when}</b>}
            </span>
            <span className="lbl-text">{m.detail}</span>
          </div>
        ))}
        {!hidden && <div className="cursor" style={{ top: yOf(d) }} />}
      </div>
    </div>
  );
}
