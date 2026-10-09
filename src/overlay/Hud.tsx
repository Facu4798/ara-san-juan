import { useEffect, useState } from 'react';
import { ACTS, type Beat } from '../story/beats';
import { descentDepth, RAIL_MARKS, NO_DATA_BAND } from '../story/descent';
import { VOYAGE_LABEL, voyageStop } from '../data/route';
import { WRECK_DEPTH_M } from '../data/depth';
import { obeliscos } from '../data/landmarks';
import { absolutePressureAtm, kgfPerCm2 } from '../utils/physics';
import { fmt0, fmt1 } from '../utils/format';

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
    hora = p < 0.3 ? '08:27' : p < 0.62 ? '09:35' : '10:51';
    const min = hora === '08:27' ? 68 : hora === '09:35' ? 136 : 212;
    extra = `sin comunicación hace ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
  }
  if (beat.id === 'implosion') {
    fecha = '15 nov. 2017';
    hora = '10:51';
    extra = 'evento acústico registrado';
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
  const text =
    beat.world === 'map'
      ? 'Mapa 3D · relieve GEBCO 2020 exagerado ×25 en el mar y ×8 en tierra · costa Natural Earth'
      : beat.world === 'concept'
        ? 'Representación conceptual · no reproduce el hecho'
        : beat.id === 'memorial' || beat.id === 'cierre'
          ? 'Las 44 luces: una por persona'
          : 'Escala real 1:1 · fondo GEBCO 2020 del sitio';
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

/**
 * Profundidad + presión + equivalencia, y el carril que une profundidad, hora y hecho.
 * La posición de cada marca en el carril es proporcional a la profundidad real; los rótulos
 * se reparten para no superponerse y una línea guía los une con su profundidad.
 * El tramo de 100 a 907 m va rayado: no hay ningún dato publicado sobre el submarino ahí.
 */
export function DepthHud({ beat, p }: { beat: Beat; p: number }) {
  const vh = useViewportHeight();
  if (beat.id !== 'descenso' && beat.id !== 'hallazgo') return null;
  const d = beat.id === 'descenso' ? descentDepth(p) : WRECK_DEPTH_M;
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
      {beat.id === 'descenso' && (
        <div className="readout">
          <div>
            <span className="depth">{fmt0(d)}</span>
            <span className="unit">m</span>
          </div>
          <div className="pressure">≈ {fmt1(absolutePressureAtm(d))} atm · {fmt0(kgfPerCm2(d))} kg/cm²</div>
          <div className="obel">= {fmt1(obeliscos(d))} Obeliscos apilados</div>
          <div className="calc">presión y equivalencia: cálculo propio</div>
          {current && (
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
        <div className="cursor" style={{ top: yOf(d) }} />
      </div>
    </div>
  );
}
