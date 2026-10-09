import * as THREE from 'three';
import type { Certainty } from '../data/types';
import { VOYAGE_TIMING } from '../data/route';
import { OUT, BACK, along } from '../three/routePath';
import { ANCHOR, SUB_START, bearingToYaw } from './anchors';
import { T, D } from './timeline';
import { clamp, frac, seg, smooth, track, wobble } from './track';

/**
 * EL SUBMARINO COMO PROTAGONISTA. Función pura del tiempo de la película: dónde está, cómo
 * está orientado, a qué profundidad y con qué grado de certeza. Lo que se sabe se ve sólido;
 * lo que no se sabe se ve fantasma; el descenso es una reconstrucción rotulada.
 *
 * Datos usados (todos con fuente): puertos y fechas del viaje, la coordenada de las 00:28, el
 * rumbo 080° a las 23:42 y 015° a las 07:19, los 18 m de las 07:19 y la coordenada del hallazgo.
 * Todo lo demás (trazado, rumbo intermedio, perfil del descenso) es diseño y se rotula.
 */

export type SubMode = 'oculto' | 'solido' | 'fantasma' | 'reconstruccion' | 'colapsando';

export interface SubState {
  /** Centro del casco en km (marco del mapa). En superficie y = 0; sumergido y = −profundidad/1000. */
  pos: THREE.Vector3;
  yaw: number;
  pitch: number;
  roll: number;
  depthM: number;
  /** true mientras navega en superficie. */
  surfaced: boolean;
  mode: SubMode;
  opacity: number;
  /** Velocidad aparente (nudos) para la hélice y el sonido. */
  speedKn: number;
  /** Avance del pandeo del casco (0 a 1). */
  collapse: number;
  certainty: Certainty | 'reconstruccion';
  caption: string;
}

/** Profundidad de la escena en la que se produce el colapso. NUNCA se muestra como dato: no está publicada. */
export const COLLAPSE_DEPTH_M = 745;
/** Duración del pandeo (s) y del desvanecimiento posterior. */
export const COLLAPSE_SECONDS = 0.28;

const V = VOYAGE_TIMING;
/** Trapecio de velocidad: arranca, navega a régimen y frena. Más natural que un único smoothstep. */
function easeTrap(x: number, a = 0.16) {
  const u = clamp(x);
  const k = 2 * a * (1 - a);
  if (u < a) return (u * u) / k;
  if (u > 1 - a) return 1 - ((1 - u) * (1 - u)) / k;
  return (u - a / 2) / (1 - a);
}

const outStart = along(OUT, 0).pos;
const startOffset = SUB_START.clone().sub(outStart).setY(0);

const yawBackStart = along(BACK, 0).yaw;
const YAW_080 = bearingToYaw(80);
const YAW_015 = bearingToYaw(15);
const yawEnd = along(BACK, 1).yaw;
/** Rumbo documentado: 080° a las 23:42 y 015° a las 07:19. Entre medio, un giro suave (diseño). */
const T_ARRIVE = T.viaje + D.viaje * VOYAGE_TIMING.back[1];
const patrolYaw = track([
  [T_ARRIVE, yawEnd],
  [T.c2342 + 1.3, YAW_080],
  [T.c0600 + 0.5, YAW_080 + 0.05],
  [T.c0719 - 0.2, YAW_015 + 0.1],
  [T.c0719 + 1.6, YAW_015],
]);

/** Profundidad documentada: 0 m hasta las 07:19 y 18 m en la última comunicación. */
const patrolDepth = track([
  [T.c0719 - 0.4, 0],
  [T.c0719 + 0.5, 3],
  [T.c0719 + 1.7, 18],
  [T.silencio + 8, 18],
]);

/** Descenso ilustrativo: despacio al principio (se leen 18, 40 y 100 m) y cada vez más rápido. */
const DESCENT_T0 = T.descenso + 1.9;
const DESCENT_T1 = T.colapso;
export function descentDepthAt(t: number) {
  const u = frac(t, DESCENT_T0, DESCENT_T1);
  return COLLAPSE_DEPTH_M * Math.pow(u, 1.55);
}

export function voyageFractions(t: number) {
  const p = (t - T.viaje) / D.viaje;
  const fOut = easeTrap(frac(p, V.out[0], V.out[1]));
  const fBack = easeTrap(frac(p, V.back[0], V.back[1]));
  return { p, fOut, fBack, onBack: p >= V.back[0] };
}

/** Rumbo del viaje sin filtrar: sigue la curva y hace una media vuelta lenta en Ushuaia (llegada → salida). */
const ARRIVE_YAW = along(OUT, 1).yaw;
function rawVoyageYaw(t: number) {
  const { p, fOut, fBack } = voyageFractions(t);
  const t0 = V.out[1] - 0.05;
  const t1 = V.back[0] + 0.05;
  const yOut = p < V.back[0] ? along(OUT, fOut).yaw : ARRIVE_YAW;
  const yBack = p >= V.back[0] ? along(BACK, fBack).yaw : yawBackStart;
  if (p <= t0) return yOut;
  if (p >= t1) return yBack;
  let d = yBack - yOut;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  if (Math.abs(Math.abs(d) - Math.PI) < 0.35) d = Math.PI; // la media vuelta siempre gira hacia el mismo lado
  return yOut + d * smooth(frac(p, t0, t1));
}

/**
 * Rumbo suavizado en el tiempo (tabla a 120 Hz con media móvil de ~0,7 s, dos pasadas): el trazado
 * esquemático tiene curvas cerradas (canal de Beagle) que, recorridas a esta velocidad, harían
 * temblar la proa. Es un filtro de puesta en escena, no un dato.
 */
const YAW_HZ = 120;
const YAW_T0 = T.viaje;
const YAW_N = Math.ceil((T_ARRIVE - YAW_T0) * YAW_HZ) + 1;
const yawTable = (() => {
  const raw = new Float64Array(YAW_N);
  let prev = 0;
  for (let i = 0; i < YAW_N; i++) {
    let y = rawVoyageYaw(YAW_T0 + i / YAW_HZ);
    if (i > 0) {
      while (y - prev > Math.PI) y -= 2 * Math.PI;
      while (y - prev < -Math.PI) y += 2 * Math.PI;
    }
    raw[i] = y;
    prev = y;
  }
  const half = Math.round(0.35 * YAW_HZ);
  let src = raw;
  for (let pass = 0; pass < 2; pass++) {
    const out = new Float64Array(YAW_N);
    for (let i = 0; i < YAW_N; i++) {
      let sum = 0;
      let cnt = 0;
      for (let j = Math.max(0, i - half); j <= Math.min(YAW_N - 1, i + half); j++) {
        sum += src[j];
        cnt++;
      }
      out[i] = sum / cnt;
    }
    src = out;
  }
  return src;
})();
function voyageYaw(t: number) {
  const x = clamp((t - YAW_T0) * YAW_HZ, 0, YAW_N - 1);
  const i = Math.min(YAW_N - 2, Math.floor(x));
  return yawTable[i] + (yawTable[i + 1] - yawTable[i]) * (x - i);
}

export function subAt(t: number): SubState {
  let pos = new THREE.Vector3();
  let yaw = 0;
  let pitch = 0;
  let roll = 0;
  let depthM = 0;
  let mode: SubMode = 'solido';
  let opacity = 1;
  let speedKn = 0;
  let collapse = 0;
  let certainty: SubState['certainty'] = 'hecho';
  let caption = '';

  if (t < T.descenso - 0.9) {
    // ——— Mar del Plata → Ushuaia → zona de patrulla → coordenada de las 00:28 ———
    const { p, fOut, fBack, onBack } = voyageFractions(t);
    if (p < V.back[0]) {
      const a = along(OUT, fOut);
      pos.copy(a.pos).addScaledVector(startOffset, 1 - smooth(fOut / 0.025)).setY(0);
      yaw = voyageYaw(t);
      if (p < V.out[0]) {
        caption = 'En Mar del Plata, su base · 25/10/2017';
      } else if (p < V.holdUshuaia[0]) {
        certainty = 'hipotesis';
        caption = 'Rumbo a Ushuaia · trazado esquemático';
      } else {
        caption = 'Escala en Ushuaia · 4 al 8/11/2017';
      }
      speedKn = p >= V.out[0] && p < V.out[1] ? 9 : 0.5;
    } else if (onBack && p < V.holdEnd[0]) {
      const a = along(BACK, fBack);
      pos.copy(a.pos).setY(0);
      yaw = voyageYaw(t);
      certainty = 'hipotesis';
      caption = 'Sale a patrullar · trazado esquemático';
      speedKn = 9;
    } else {
      pos.copy(ANCHOR.p0028).setY(0);
      yaw = patrolYaw(t);
      caption = t < T.c0600 ? 'Posición GPS informada a las 00:28' : 'Última coordenada conocida · posición posterior no publicada';
      if (t >= T.c0600) certainty = 'desconocido';
      speedKn = t < T.c0719 ? 5 : 3;
    }
    // Aparece cuando las 44 luces se funden en el casco.
    opacity = seg(t, T.viaje - 0.1, T.viaje + 1.1);
    if (opacity <= 0.001) mode = 'oculto';

    // Balanceo: marejada en el temporal del 23:42 (documentado) y mar tranquilo antes.
    const storm = seg(t, T.c2342 - 1, T.c2342 + 0.8) * (1 - seg(t, T.c0600, T.c0719 + 0.8));
    roll = wobble(t * 0.9, 1) * (0.015 + 0.14 * storm);
    pitch = wobble(t * 0.7, 2) * (0.01 + 0.06 * storm);

    // Inmersión de las 07:19.
    depthM = patrolDepth(t);
    if (depthM > 0.2) {
      pos.y = -depthM / 1000;
      pitch -= 0.09 * Math.sin(Math.PI * clamp(frac(t, T.c0719 - 0.2, T.c0719 + 1.9)));
      certainty = 'hecho';
      caption = 'Navega a 18 m · última comunicación (07:19)';
    }

    // Silencio: a partir de las 07:19 no hay posición publicada → fantasma.
    if (t >= T.silencio) {
      mode = 'fantasma';
      opacity = 0.34 + 0.66 * (1 - seg(t, T.silencio, T.silencio + 1.2));
      opacity *= 1 - seg(t, T.descenso - 2.0, T.descenso - 0.9);
      certainty = 'desconocido';
      caption = 'Posición desconocida desde las 00:28';
      speedKn = 0;
    }
  } else {
    // ——— Descenso ilustrativo sobre la coordenada del hallazgo ———
    const k = t - T.descenso;
    certainty = 'reconstruccion';
    mode = 'reconstruccion';
    caption = 'Reconstrucción · descenso ilustrativo';
    pos.copy(ANCHOR.wreck);
    yaw = 0.18 + 0.05 * Math.sin(k * 0.4);
    opacity = seg(t, T.descenso - 0.6, T.descenso + 0.9);

    depthM = t < T.colapso ? descentDepthAt(t) : COLLAPSE_DEPTH_M;
    const sink = frac(t, T.descenso + 1.2, DESCENT_T0 + 2.0);
    pos.y = -depthM / 1000;
    speedKn = 2 + 4 * sink * (1 - seg(t, T.colapso - 1.2, T.colapso));
    pitch = -0.1 * seg(t, DESCENT_T0 - 0.4, DESCENT_T0 + 1.6);
    const stress = seg(depthM, 100, COLLAPSE_DEPTH_M);
    roll = wobble(t * 1.3, 4) * (0.01 + 0.045 * stress);

    if (t >= T.colapso) {
      const c = t - T.colapso;
      mode = 'colapsando';
      collapse = 1 - Math.pow(1 - clamp(c / COLLAPSE_SECONDS), 2.4);
      opacity = 1 - seg(c, 0.45, 1.4);
      if (opacity <= 0.001) mode = 'oculto';
      speedKn = 0;
      caption = 'Representación del colapso · no reproduce el hecho';
    }
  }

  return {
    pos,
    yaw,
    pitch,
    roll,
    depthM,
    surfaced: depthM < 0.5,
    mode,
    opacity,
    speedKn,
    collapse,
    certainty,
    caption,
  };
}
