import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useScrollSection } from '../utils/useScrollSection';
import type { GeoData } from '../utils/loadData';
import { DepthColumn2D } from '../visualizations/DepthColumn2D';
import { depthMarkers, WRECK_DEPTH_M, SUBMARINE, DEBRIS_FIELD_M } from '../data/depth';
import { absolutePressureAtm } from '../utils/physics';
import { fmt0, fmt1 } from '../utils/format';
import { CertaintyBadge, SourceRefs } from '../components/Certainty';
import { useStepNarration, useAudioState, effect, setDepth, resumeAmbient } from '../audio/useAudio';
import type { Certainty } from '../data/types';
import { DIST } from './storySteps';

const DescentScene = lazy(() => import('./DescentScene'));

interface DStep {
  id: string;
  from: number;
  to: number;
  weight: number;
  eyebrow: string;
  title: string;
  body: string[];
  note?: string;
  certainty?: Certainty;
  sourceIds: string[];
  scaleStrip?: boolean;
}

const marker = (d: number) => depthMarkers.find((m) => m.depthM === d)!;

const STEPS: DStep[] = [
  { id: 'sup', from: 0, to: 0, weight: 1, eyebrow: '0 m', title: 'Superficie', body: [`El submarino, a escala: ${fmt1(SUBMARINE.esloraM)} m de eslora.`], note: 'Esquema de 65,93 × 7 m. No reproduce el interior ni el estado de los restos.', sourceIds: SUBMARINE.sourceIds },
  { id: 'd18', from: 0, to: 18, weight: 1, eyebrow: '07:19 · 15/11/2017', title: `18 m — ${marker(18).label}`, body: [marker(18).detalle], certainty: 'hecho', sourceIds: marker(18).sourceIds },
  { id: 'd40', from: 18, to: 40, weight: 1, eyebrow: '07:19 · intención', title: `40 m — ${marker(40).label}`, body: [marker(40).detalle], certainty: 'hecho', sourceIds: marker(40).sourceIds },
  { id: 'd100', from: 40, to: 100, weight: 1, eyebrow: 'Restricción operativa', title: `100 m — ${marker(100).label}`, body: [marker(100).detalle], certainty: 'hecho', sourceIds: marker(100).sourceIds },
  { id: 'tramo', from: 100, to: 800, weight: 2.6, eyebrow: '300 · 500 · 700 m', title: 'Sin eventos documentados', body: ['En este tramo no hay datos publicados sobre el submarino. Sólo la escala.'], note: 'El oscurecimiento y el sonido son convenciones de diseño, no mediciones del sitio.', sourceIds: [] },
  { id: 'd800', from: 800, to: 870, weight: 1, eyebrow: '15/11/2018 · 22:15', title: `≈ 800 m — ${marker(800).label}`, body: [marker(800).detalle], certainty: 'estimacion', sourceIds: marker(800).sourceIds },
  { id: 'd907', from: 870, to: WRECK_DEPTH_M, weight: 1.3, eyebrow: '17/11/2018', title: '907 m', body: ['«Una sección mayor, comprendida por el casco resistente, se encuentra en una sola pieza a 907 metros».', `Campo de escombros: ${DEBRIS_FIELD_M.a} × ${DEBRIS_FIELD_M.b} m.`], note: 'Punto blanco: coordenada publicada. La silueta indica escala, no posición ni orientación de los restos. Relieve: GEBCO 2020, celdas de ~460 m.', certainty: 'hecho', sourceIds: ['armadaGacetilla1711', 'mindef2018', 'gebco2020'] },
  { id: 'escala', from: WRECK_DEPTH_M, to: WRECK_DEPTH_M, weight: 1.4, eyebrow: 'Escala', title: 'Profundo, pero sobre todo lejos', body: [`907 m equivalen a ${fmt1(WRECK_DEPTH_M / SUBMARINE.esloraM)} veces la eslora del submarino.`, `La distancia entre la última coordenada y el hallazgo (${fmt0(DIST.wreck)} km) es ${fmt0((DIST.wreck * 1000) / WRECK_DEPTH_M)} veces esa profundidad.`], note: 'Cálculos propios a partir de datos documentados.', sourceIds: ['armadaGacetilla1711', 'infobae2026requerimiento', 'lanacion2018coordenada'], scaleStrip: true },
];

const TOTAL = STEPS.reduce((a, s) => a + s.weight, 0);
const ease = (t: number) => t * t * (3 - 2 * t);

export function DescentChapter({ geo, use3D }: { geo: GeoData | null; use3D: boolean }) {
  const units = Math.round(TOTAL * 10);
  const { ref, progress } = useScrollSection(units);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [exag, setExag] = useState(1);
  const stickyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = stickyRef.current?.parentElement;
    if (!el) return;
    // near: montar la escena antes de llegar; visible: dibujar cuadros sólo en pantalla.
    const ioNear = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '200px 0px' });
    const ioVisible = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    ioNear.observe(el);
    ioVisible.observe(el);
    return () => {
      ioNear.disconnect();
      ioVisible.disconnect();
    };
  }, []);

  // progreso global → paso ponderado
  let acc = 0;
  let idx = 0;
  let local = 0;
  const pos = progress * TOTAL;
  for (let i = 0; i < STEPS.length; i++) {
    if (pos <= acc + STEPS[i].weight || i === STEPS.length - 1) {
      idx = i;
      local = Math.min(1, Math.max(0, (pos - acc) / STEPS[i].weight));
      break;
    }
    acc += STEPS[i].weight;
  }
  const s = STEPS[idx];
  const depth = s.from + (s.to - s.from) * ease(Math.min(1, local * 1.25));
  const rulerMax = 950;

  // ——— Sonido ———
  // La profundidad mueve el zumbido y el siseo; los umbrales disparan la alarma
  // de los 100 m y los crujidos. Todo sintetizado: no son registros del sitio.
  useStepNarration(`descent:${s.id}`);
  const { ready } = useAudioState();
  const revealed = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (visible) {
      resumeAmbient();
      setDepth(depth);
    } else {
      setDepth(0);
    }
  }, [depth, visible, ready]);

  useEffect(() => {
    if (!ready || !visible) return;
    if (s.id === 'd907' && !revealed.current) {
      revealed.current = true;
      effect('reveal');
    } else if (s.id !== 'd907' && s.id !== 'escala') {
      revealed.current = false;
    }
  }, [s.id, visible, ready]);

  return (
    <section id="profundidad" ref={ref} className="scrolly" style={{ height: `${TOTAL * 100}vh` }} aria-label="Capítulo: 907 metros">
      <div className="scrolly-sticky" ref={stickyRef} style={{ background: '#020507' }}>
        <div className="chapter-label">06 · 907 metros</div>
        {geo && near && use3D && (
          <Suspense fallback={null}>
            <DescentScene depth={depth} grid={geo.wreckLocal} exaggeration={exag} active={visible} />
          </Suspense>
        )}
        {geo && !use3D && (
          <div className="depth2d-wrap">
            <DepthColumn2D depth={depth} grid={geo.wreckLocal} />
          </div>
        )}

        <div className="descent-hud" aria-live="polite">
          <div>
            <span className="depth">{fmt0(depth)}</span>
            <span className="unit">m</span>
          </div>
          <div className="pressure">≈ {fmt1(absolutePressureAtm(depth))} atm</div>
          <div className="calc">presión calculada · 1 atm + ρ·g·h</div>
        </div>

        <div className="depth-ruler" aria-hidden="true">
          {[0, 100, 300, 500, 700, 907].map((d) => (
            <div key={d} className="tick" style={{ top: `${(d / rulerMax) * 100}%` }}>
              <span>{d}</span>
            </div>
          ))}
          <div className="cursor" style={{ top: `${(depth / rulerMax) * 100}%` }} />
        </div>

        {use3D && (
          <div style={{ position: 'absolute', left: 'var(--gutter)', bottom: 20, zIndex: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="eyebrow">relieve</span>
            <button className="chip" aria-pressed={exag === 1} onClick={() => setExag(1)}>escala real</button>
            <button className="chip" aria-pressed={exag === 4} onClick={() => setExag(4)}>exagerado ×4</button>
          </div>
        )}

        <div className="scrolly-steps">
          {STEPS.map((st, i) => (
            <article key={st.id} className="step-card" aria-hidden={i !== idx}
              style={{ opacity: i === idx ? 1 : 0, visibility: Math.abs(i - idx) > 1 ? 'hidden' : 'visible' }}>
              <div className="eyebrow">{st.eyebrow}</div>
              <h3>{st.title}</h3>
              {st.body.map((b, j) => <p key={j}>{b}</p>)}
              {st.scaleStrip && (
                <svg viewBox="0 0 400 40" style={{ width: '100%', margin: '6px 0 10px' }} role="img" aria-label="Barra a escala: 91 kilómetros de ancho frente a 907 metros de alto">
                  <rect x={0} y={20} width={400} height={Math.max(1, (400 * WRECK_DEPTH_M) / (DIST.wreck * 1000))} fill="var(--hecho)" />
                  <text x={0} y={14} fontSize={10} fill="var(--muted)" fontFamily="IBM Plex Mono, monospace">{fmt0(DIST.wreck)} km (horizontal)</text>
                  <text x={400} y={36} fontSize={10} textAnchor="end" fill="var(--muted)" fontFamily="IBM Plex Mono, monospace">alto de la barra = 907 m</text>
                </svg>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {st.certainty && <CertaintyBadge c={st.certainty} />}
                <SourceRefs ids={st.sourceIds} />
              </div>
              {st.note && <p className="note">{st.note}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
