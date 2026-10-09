import { useRef } from 'react';
import { setApp, useApp } from '../../app/appStore';
import { CertaintyBadge, SourceRefs } from '../../components/Certainty';
import { WRECK_DEPTH_M, SUBMARINE, depthMarkers } from '../../data/depth';
import { obeliscos } from '../../data/landmarks';
import { RAIL_MARKS } from '../../story/descent';
import { absolutePressureAtm, kgfPerCm2, SEAWATER_DENSITY, G } from '../../utils/physics';
import { fmt0, fmt1 } from '../../utils/format';
import { comparisonAt, lightZone, DEPTH_STOPS } from './depthModel';

/**
 * MÓDULO 4 · Control de profundidad y datos físicos.
 */
const clamp = (d: number) => Math.min(WRECK_DEPTH_M, Math.max(0, d));

/** Posición de cada parada (en %): proporcional a la profundidad, separada lo mínimo para leerse. */
function spreadStops() {
  let last = -Infinity;
  return DEPTH_STOPS.map((s) => {
    const top = Math.max((s.d / WRECK_DEPTH_M) * 100, last + 3.4);
    last = top;
    return { ...s, top };
  });
}

export function DepthControl() {
  const depth = useApp((s) => s.depth);
  const track = useRef<HTMLDivElement>(null);
  const set = (d: number) => setApp({ depth: clamp(Math.round(d * 2) / 2) });
  const fromPointer = (clientY: number) => {
    const r = track.current!.getBoundingClientRect();
    set(((clientY - r.top) / r.height) * WRECK_DEPTH_M);
  };
  return (
    <div className="depth-control" role="group" aria-label="Control de profundidad">
      <div className="depth-readout" aria-live="polite">
        <span className="lbl">PROFUNDIDAD</span>
        <span className="val">{fmt0(depth)} m</span>
      </div>
      <div className="depth-body">
        <div
          className="depth-track"
          ref={track}
          role="slider"
          tabIndex={0}
          aria-label="Profundidad"
          aria-valuemin={0}
          aria-valuemax={WRECK_DEPTH_M}
          aria-valuenow={Math.round(depth)}
          aria-valuetext={`${fmt0(depth)} metros`}
          onPointerDown={(e) => { try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* sin captura: el arrastre sigue funcionando */ } fromPointer(e.clientY); }}
          onPointerMove={(e) => { if (e.buttons === 1) fromPointer(e.clientY); }}
          onWheel={(e) => set(depth + Math.sign(e.deltaY) * 10)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); set(depth + (e.shiftKey ? 50 : 10)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); set(depth - (e.shiftKey ? 50 : 10)); }
            if (e.key === 'End') set(WRECK_DEPTH_M);
            if (e.key === 'Home') set(0);
          }}
        >
          <div className="fill" style={{ height: `${(depth / WRECK_DEPTH_M) * 100}%` }} />
          <div className="knob" style={{ top: `${(depth / WRECK_DEPTH_M) * 100}%` }} />
        </div>
        <ul className="depth-stops">
          {spreadStops().map((s) => (
            <li key={s.d} style={{ top: `${s.top}%` }}>
              <button type="button" className={Math.abs(depth - s.d) < 1 ? 'on' : ''} onClick={() => set(s.d)}>{s.label}</button>
            </li>
          ))}
        </ul>
      </div>
      <p className="muted small">Arrastrá, usá la rueda o ↑ ↓ (con Mayús, de a 50 m).</p>
    </div>
  );
}

export function DepthInfo() {
  const depth = useApp((s) => s.depth);
  const pinned = useApp((s) => s.pinComparison);
  const open = useApp((s) => s.physicsOpen);
  const cmp = comparisonAt(depth, pinned);
  const light = lightZone(depth);
  const passed = RAIL_MARKS.filter((m) => m.kind !== 'referencia' && depth >= m.depthM - 0.5);
  const mark = passed[passed.length - 1];

  return (
    <div className="panel-body">
      <h2 className="panel-title">907 metros</h2>
      <p className="panel-lede">Bajá a escala real. Cada referencia aparece cuando sirve para comparar, y se va.</p>

      <section className={`compare-card${cmp ? ' on' : ''}`} aria-live="polite">
        {cmp ? (
          <>
            <p className="big-text">{cmp.c.texto}</p>
            <p className="small">{cmp.c.detalle} <SourceRefs ids={cmp.c.sourceIds} /></p>
          </>
        ) : (
          <p className="muted">Seguí bajando: la próxima referencia aparece al llegar a su profundidad.</p>
        )}
        <label className="toggle small">
          <input type="checkbox" checked={pinned} onChange={(e) => setApp({ pinComparison: e.target.checked })} />
          <span>Mantener visible la última comparación alcanzada</span>
        </label>
      </section>

      {mark && (
        <section className="doc-depth">
          <div className="eyebrow">Lo documentado hasta acá</div>
          <p><CertaintyBadge c={mark.kind === 'estimacion' ? 'estimacion' : 'hecho'} /> <strong>{mark.label}</strong>{mark.when && ` · ${mark.when}`}: {mark.detail} <SourceRefs ids={mark.sourceIds} /></p>
          {depth > 100 && depth < WRECK_DEPTH_M - 1 && (
            <p className="small"><CertaintyBadge c="desconocido" /> Entre 100 y 907 m no hay ningún dato publicado sobre el submarino: no se sabe cuándo ni cómo descendió.</p>
          )}
        </section>
      )}

      <details open={open} onToggle={(e) => setApp({ physicsOpen: (e.target as HTMLDetailsElement).open })}>
        <summary>Datos físicos</summary>
        <dl className="physics">
          <dt>Profundidad</dt><dd>{fmt0(depth)} m</dd>
          <dt>Presión absoluta</dt><dd>≈ {fmt1(absolutePressureAtm(depth))} atm <span className="muted small">(estimación)</span></dd>
          <dt>Sobre cada cm²</dt><dd>≈ {fmt0(kgfPerCm2(depth))} kg de agua</dd>
          <dt>Equivale a</dt><dd>{fmt1(obeliscos(depth))} Obeliscos apilados</dd>
          <dt>Luz</dt><dd>{light.zona}. {light.texto} <SourceRefs ids={['noaaLuz']} /></dd>
          <dt>Temperatura</dt><dd className="muted">No se muestra: no hay mediciones del sitio para esa fecha.</dd>
        </dl>
        <p className="muted small">
          Presión = 1 atm + ρ·g·h, con ρ = {SEAWATER_DENSITY} kg/m³ (constante) y g = {G} m/s². Ignora la compresibilidad del agua y los cambios de densidad por temperatura y salinidad (error menor al 1 % en los primeros 1.000 m). El oscurecimiento de la escena es una convención visual, no una medición.
        </p>
      </details>

      <DepthFindings />
    </div>
  );
}

/**
 * Lo que se desprende de los datos de profundidad: todo sale de los valores documentados
 * (18, 40, 100 y 907 m, y la eslora) con cuentas explícitas.
 */
function DepthFindings() {
  const limite = depthMarkers.find((m) => m.depthM === 100)!;
  const sinDatos = WRECK_DEPTH_M - limite.depthM;
  return (
    <section className="findings">
      <h4>Lo que muestran los datos</h4>
      <ul>
        <li>
          Los {WRECK_DEPTH_M} m del hallazgo son <strong>{fmt1(WRECK_DEPTH_M / limite.depthM)} veces</strong> el límite
          preventivo de {limite.depthM} m con el que el submarino tenía autorizado operar en noviembre de 2017.
          <SourceRefs ids={limite.sourceIds} />
        </li>
        <li>
          Entre esos {limite.depthM} m y los {WRECK_DEPTH_M} m hay <strong>{fmt0(sinDatos)} m</strong> —el{' '}
          {fmt0((sinDatos / WRECK_DEPTH_M) * 100)} % de la columna— sin <em>ningún</em> dato publicado sobre el submarino:
          no se sabe cuándo ni cómo descendió.
        </li>
        <li>
          A esa profundidad la presión estimada es de <strong>≈ {fmt1(absolutePressureAtm(WRECK_DEPTH_M))} atm</strong>:
          unos {fmt0(kgfPerCm2(WRECK_DEPTH_M))} kg sobre cada cm² del casco.
        </li>
        <li>
          Equivalen a <strong>{fmt1(WRECK_DEPTH_M / SUBMARINE.esloraM)} veces</strong> la eslora del propio submarino
          ({fmt1(SUBMARINE.esloraM)} m) y a {fmt1(obeliscos(WRECK_DEPTH_M))} Obeliscos apilados.
        </li>
      </ul>
      <p className="muted small">
        Cocientes y presión: cálculo propio sobre los valores documentados.
        <SourceRefs ids={['armadaGacetilla1711', 'mdpEmtur', 'obeliscoGCBA']} />
      </p>
    </section>
  );
}
