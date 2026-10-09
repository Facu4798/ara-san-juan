import * as THREE from 'three';
import { absolutePressureAtm, kgfPerCm2 } from '../utils/physics';
import { WRECK_DEPTH_M } from '../data/depth';
import { T } from './timeline';
import { COLLAPSE_DEPTH_M, subAt } from './subPath';
import { clamp, lerp, seg } from './track';

/**
 * EL «CLIMA» DE LA ESCENA: cómo se ve y se siente la presión.
 *
 * DATOS (con fuente): profundidades 18 m (07:19), 40 m (intención), 100 m (límite preventivo),
 * 907 m (hallazgo), la fórmula de presión y la zona de luz (NOAA: 0–200 m eufótica,
 * 200–1000 m disfótica).
 * DISEÑO (rotulado así en Metodología): todo el mapeo de esos números a color, niebla, viñeta,
 * temblor, partículas y sonido. El «estrés» no es una medición: es una variable de puesta en escena
 * que arranca en el límite preventivo (100 m) y crece hasta el colapso.
 */

/** Color del agua según la profundidad de la cámara: celeste grisáceo → azul petróleo → casi oscuro, sin llegar al negro. */
const WATER_STOPS: [number, THREE.Color][] = [
  [0, new THREE.Color('#3f7a90')],
  [18, new THREE.Color('#2f6a80')],
  [100, new THREE.Color('#1e4d62')],
  [250, new THREE.Color('#143748')],
  [600, new THREE.Color('#0d2634')],
  [WRECK_DEPTH_M, new THREE.Color('#0a1b25')],
];

function waterColor(depthM: number, out: THREE.Color) {
  if (depthM <= 0) return out.copy(WATER_STOPS[0][1]);
  for (let i = 1; i < WATER_STOPS.length; i++) {
    if (depthM <= WATER_STOPS[i][0]) {
      const t = (depthM - WATER_STOPS[i - 1][0]) / (WATER_STOPS[i][0] - WATER_STOPS[i - 1][0]);
      return out.copy(WATER_STOPS[i - 1][1]).lerp(WATER_STOPS[i][1], t);
    }
  }
  return out.copy(WATER_STOPS[WATER_STOPS.length - 1][1]);
}

const NIGHT_HAZE = new THREE.Color('#0f2234');
const MAP_BG = new THREE.Color('#14303e');
const STORM_BG = new THREE.Color('#0f232d');

export interface Env {
  /** Profundidad de la cámara (m); 0 sobre el agua. */
  camDepthM: number;
  /** Profundidad del submarino (m). */
  subDepthM: number;
  /** Color de fondo y de niebla. */
  bg: THREE.Color;
  /** Densidad de niebla exponencial cuadrática, por km. */
  fog: number;
  hemi: number;
  sun: number;
  /** Luz propia del casco (intensidad). */
  lamp: number;
  /** 0 a 1: puesta en escena de la presión. 0 por encima del límite preventivo. */
  stress: number;
  /** Efectos de pantalla (0 a 1). */
  vignette: number;
  grain: number;
  desat: number;
  amber: number;
  /** Temblor de cámara (grados). */
  shake: number;
  /** Velocidad y densidad de la nieve marina / burbujas (0 a 1). */
  snow: number;
  /** Haces de luz bajo la superficie (0 a 1). */
  rays: number;
  /** Mar agitado (0 a 1): temporal del 23:42. */
  storm: number;
  /** Cuánto de la noche inicial queda (1 al arrancar, 0 después). */
  night: number;
  pressureAtm: number;
  kgf: number;
  /** Oscuridad de cierre tras el colapso (0 a 1). */
  blackout: number;
}

export const FLASH_AT = 0.0;

/** Estrés de puesta en escena como función de la profundidad del submarino. */
export function stressAt(depthM: number) {
  return seg(depthM, 100, COLLAPSE_DEPTH_M) * 0.85 + seg(depthM, COLLAPSE_DEPTH_M * 0.82, COLLAPSE_DEPTH_M) * 0.15;
}

const out: Env = {
  camDepthM: 0, subDepthM: 0, bg: new THREE.Color(), fog: 0, hemi: 1, sun: 1, lamp: 0, stress: 0, vignette: 0, grain: 0,
  desat: 0, amber: 0, shake: 0, snow: 0, rays: 0, storm: 0, night: 0, pressureAtm: 1, kgf: 0, blackout: 0,
};

/**
 * Entorno en el instante t con la cámara a la altura camY (km sobre el mar; negativa = bajo el agua)
 * y a distancia camDist (km) de su foco.
 */
export function envAt(t: number, camY: number, camDist: number): Env {
  const sub = subAt(t);
  const camDepthM = Math.max(0, -camY * 1000);
  out.camDepthM = camDepthM;
  out.subDepthM = sub.depthM;

  const afterCollapse = t >= T.colapso;
  const preStress = stressAt(sub.depthM);
  // Tras el colapso la tensión cae de golpe: queda el silencio.
  const stress = afterCollapse ? preStress * (1 - seg(t, T.colapso, T.colapso + 0.6)) : preStress;
  out.stress = stress;

  // Presión según la profundidad DEL SUBMARINO (lo que el manómetro informa).
  out.pressureAtm = absolutePressureAtm(sub.depthM);
  out.kgf = kgfPerCm2(sub.depthM);

  // Noche inicial → luz de mapa; temporal entre el 23:42 y el aviso de las 07:19.
  out.night = 1 - seg(t, T.viaje + 0.2, T.viaje + 2.6);
  out.storm = seg(t, T.c2342 - 0.8, T.c2342 + 0.6) * (1 - seg(t, T.c0719 - 0.2, T.c0719 + 1.2));

  // Bajo el agua el color depende de la profundidad de la cámara; encima, del momento.
  const under = clamp((0.004 - camY) / 0.012); // 0 sobre el agua → 1 a 8 m bajo ella
  const above = new THREE.Color();
  above.copy(MAP_BG).lerp(STORM_BG, out.storm * 0.8).lerp(camDist < 0.5 ? NIGHT_HAZE : MAP_BG, out.night);
  const wat = waterColor(camDepthM, new THREE.Color());
  out.bg.copy(above).lerp(wat, under * under * (3 - 2 * under));

  // Niebla: sobre el agua, proporcional a la distancia de la escena (mismo aspecto de mapa a ras de mar);
  // bajo el agua, la turbidez del mar crece con la profundidad.
  const fogAbove = 0.0149 * Math.pow(Math.max(camDist, 0.05), -0.6) * lerp(1, 1.45, out.night + out.storm * 0.5);
  const fogUnder = (0.9 + 0.55 * seg(camDepthM, 0, WRECK_DEPTH_M)) * (afterCollapse ? 1.25 : 1);
  out.fog = lerp(fogAbove, fogUnder, under);

  // Luz: cae con la profundidad (zona eufótica 0–200 m, disfótica 200–1000 m, NOAA).
  const sunk = seg(camDepthM, 0, 650);
  out.hemi = lerp(lerp(1.35, 0.95, out.night), 0.3, sunk * under);
  out.sun = lerp(lerp(1.6, 0.7, out.night), 0.06, seg(camDepthM, 0, 380) * under);
  out.lamp = seg(camDepthM, 40, 520) * under * 1.5;

  // Puesta en escena de la presión.
  out.vignette = clamp(stress * 0.95 + (camDepthM > 200 ? 0.12 : 0));
  out.grain = clamp(stress * 0.9);
  out.desat = clamp(stress * 0.7);
  out.amber = clamp(seg(sub.depthM, 100, 170) * 0.55 * (1 - seg(t, T.colapso, T.colapso + 0.3)) + stress * 0.2);
  out.shake = stress * stress * 0.55;
  out.snow = clamp(seg(camDepthM, 4, 130) * (0.35 + 0.65 * stress));
  out.rays = (1 - seg(camDepthM, 0, 80)) * under * (1 - out.night) * (1 - out.storm * 0.5);
  out.blackout = afterCollapse ? seg(t, T.colapso + 0.55, T.colapso + 2.0) * 0.55 * (1 - seg(t, T.hallazgo, T.hallazgo + 1.5)) : 0;
  return out;
}
