import { useApp } from '../app/appStore';
import { useViewInfo } from '../three/explore/viewInfo';
import { MAP_VEXAG, MAP_VEXAG_LAND } from '../three/geoFrame';
import { fmt0 } from '../utils/format';

/**
 * ESCALA Y ORIENTACIÓN de la vista 3D (abajo a la derecha).
 *
 * Se declaran siempre, porque la cámara es libre: la barra mide una distancia real en el plano
 * del punto de mira y la rosa indica hacia dónde quedó el norte después de rotar la escena.
 * El texto aclara la exageración vertical del relieve, que nunca es 1:1 en los mapas.
 */

/** Longitudes «redondas» para la barra, en la unidad del mundo. */
const STEPS_KM = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
const STEPS_M = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

/** Mayor longitud redonda que no supere `maxPx` píxeles (o la más chica si ninguna entra). */
function pickStep(steps: number[], unitsPerPx: number, maxPx: number) {
  let best = steps[0];
  for (const s of steps) if (s / unitsPerPx <= maxPx) best = s;
  return { value: best, px: best / unitsPerPx };
}

export function ViewScale() {
  const module = useApp((s) => s.module);
  const subInspect = useApp((s) => s.subInspect);
  const { unitsPerPx, northDeg, northLean } = useViewInfo();

  const studio = module === 'travesia' && subInspect;
  const metric = studio || module === 'profundidad';
  const maxPx = Math.min(140, Math.max(84, window.innerWidth * 0.1));
  const { value, px } = pickStep(metric ? STEPS_M : STEPS_KM, unitsPerPx, maxPx);
  const note = studio
    ? 'Modelo esquemático a escala real 1:1 · grilla de 10 m'
    : metric
      ? 'Escala real 1:1 en los tres ejes · fondo GEBCO 2020'
      : `Mercator · relieve GEBCO 2020 exagerado ×${MAP_VEXAG} bajo el mar y ×${MAP_VEXAG_LAND} en tierra`;

  return (
    <div className="view-scale" aria-label={`Escala y orientación de la vista. ${note}`}>
      {!studio && (
        <div
          className="vs-north"
          aria-label={`El norte apunta a ${fmt0(((northDeg % 360) + 360) % 360)} grados en pantalla${northLean < 0.45 ? ', casi perpendicular a la pantalla' : ''}`}
        >
          <svg viewBox="-16 -16 32 32" width="30" height="30" aria-hidden="true">
            <circle r="13.5" fill="none" stroke="currentColor" strokeOpacity="0.35" />
            {/* La flecha se atenúa y se acorta cuando el norte apunta «hacia adentro» de la pantalla. */}
            <g transform={`rotate(${northDeg}) scale(1, ${(0.35 + 0.65 * northLean).toFixed(3)})`} opacity={(0.3 + 0.7 * northLean).toFixed(3)}>
              <path d="M0 9 L0 -10 M-3.4 -5 L0 -10 L3.4 -5" fill="none" stroke="var(--hecho)" strokeWidth="1.5" />
            </g>
          </svg>
          <span>N</span>
        </div>
      )}
      <div className="vs-bar">
        <div className="bar" style={{ width: `${Math.round(px)}px` }} aria-hidden="true" />
        <span className="val">
          {fmt0(value)} {metric ? 'm' : 'km'}
        </span>
      </div>
      <p className="vs-note">{note}</p>
    </div>
  );
}
