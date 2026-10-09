import * as THREE from 'three';
import { ANCHOR, SUB_START } from './anchors';
import { T } from './timeline';
import { subAt } from './subPath';
import { clamp, lerp, seg, track, wobble, type Key } from './track';

/**
 * DIRECTOR DE CÁMARA. Una sola trayectoria continua para toda la película: nunca hay un corte.
 *
 * Cada canal (punto de anclaje, peso de seguimiento al submarino, azimut, elevación, distancia,
 * campo de visión, alabeo) es una pista monótona C1 sobre el tiempo del guion. El foco es
 * una mezcla del ancla del mapa y la posición del submarino, así «seguir» es un movimiento
 * gradual y no un salto. La distancia se interpola en escala logarítmica: acercarse de 1.800 km
 * a 200 m es un zoom constante, sin tramos lentos ni bruscos.
 *
 * Es una función pura de t: scroll, reproducción y arrastre de la barra dan siempre el mismo plano.
 * Ángulos en grados, distancias en km (marco del mapa).
 */

export interface CamState {
  /** Punto que mira la cámara (km). */
  focus: THREE.Vector3;
  az: number;
  el: number;
  /** Distancia al foco (km). */
  dist: number;
  fov: number;
  roll: number;
  follow: number;
}

interface ShotKey {
  t: number;
  /** Ancla en el mapa (se ignora cuando follow = 1). */
  at?: THREE.Vector3;
  follow: number;
  az: number;
  el: number;
  dist: number;
  fov?: number;
  roll?: number;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().lerp(b, k);
const A = ANCHOR;

const seaStart = SUB_START.clone().setY(0.0015);
const midWreck = (k: number) => mix(A.p0028, A.wreck, k);
const bed = (y: number) => A.wreck.clone().setY(y);

/** Colapso a la profundidad de la escena (la misma que usa el submarino). Se repite acá para no importar un ciclo. */
const COLLAPSE_Y = -0.745;

/**
 * GUION DE CÁMARA. Los valores son de encuadre (diseño); lo que se encuadra es lo documentado.
 */
const SHOTS: ShotKey[] = [
  // I · Las 44 — a ras del agua, frente a las luces; empuje lento.
  { t: 0, at: seaStart, follow: 0, az: -90, el: 3.4, dist: 0.098 },
  { t: 5.6, at: seaStart, follow: 0, az: -88, el: 4.2, dist: 0.078 },
  // II · El viaje — el submarino se enciende con las luces y la cámara sube hasta el mapa.
  { t: T.viaje + 0.5, at: seaStart, follow: 1, az: -82, el: 6, dist: 0.12 },
  { t: T.viaje + 1.9, at: seaStart, follow: 1, az: -62, el: 20, dist: 3.5 },
  { t: T.viaje + 4.0, at: A.argentina, follow: 0.74, az: -26, el: 50, dist: 1500 },
  { t: T.viaje + 6.6, at: A.argentina, follow: 0.74, az: -6, el: 54, dist: 1850 },
  { t: T.viaje + 9.7, at: A.argentina, follow: 0.78, az: 10, el: 54, dist: 1500 },
  // III · Las últimas horas — un solo acercamiento hasta el agua, siguiendo al submarino.
  { t: T.c2342 + 0.4, at: A.p0028, follow: 1, az: 16, el: 50, dist: 620 },
  { t: T.c0028 + 0.2, at: A.p0028, follow: 1, az: 28, el: 52, dist: 235, roll: 0 },
  { t: T.c0028 + 3.4, at: A.p0028, follow: 1, az: 38, el: 46, dist: 120 },
  { t: T.c0600 + 1.2, at: A.p0028, follow: 1, az: 44, el: 34, dist: 14, roll: 2 },
  { t: T.c0719 + 0.1, at: A.p0028, follow: 1, az: 52, el: 20, dist: 1.1 },
  { t: T.c0719 + 1.1, at: A.p0028, follow: 1, az: 44, el: 9, dist: 0.3 },
  // IV · El silencio — bajo el agua; después sube y se abre para mostrar la incertidumbre.
  { t: T.silencio + 0.1, at: A.p0028, follow: 1, az: 36, el: -6, dist: 0.24, roll: 0 },
  { t: T.silencio + 1.6, at: A.p0028, follow: 1, az: 24, el: 22, dist: 6.5 },
  { t: T.silencio + 3.0, at: A.p0028, follow: 0.3, az: 12, el: 52, dist: 150 },
  { t: T.silencio + 4.4, at: midWreck(0.34), follow: 0, az: 8, el: 58, dist: 320 },
  { t: T.silencio + 5.9, at: midWreck(0.78), follow: 0, az: 4, el: 56, dist: 260 },
  // Llegada a la coordenada del hallazgo.
  { t: T.descenso - 0.9, at: bed(0), follow: 0, az: 10, el: 38, dist: 24 },
  { t: T.descenso + 0.3, at: bed(0), follow: 1, az: 16, el: 12, dist: 0.46 },
  // V · El descenso — a escala real; la cámara acompaña al submarino hacia el fondo.
  { t: T.descenso + 1.9, at: bed(0), follow: 1, az: 18, el: 5, dist: 0.25 },
  { t: T.descenso + 4.5, at: bed(0), follow: 1, az: 30, el: 6, dist: 0.24 },
  { t: T.descenso + 7.2, at: bed(0), follow: 1, az: 44, el: 11, dist: 0.34 },
  { t: T.descenso + 10.2, at: bed(0), follow: 1, az: 26, el: 13, dist: 0.3 },
  { t: T.descenso + 12.6, at: bed(0), follow: 1, az: 12, el: 7, dist: 0.2, fov: 44 },
  { t: T.colapso - 0.05, at: bed(0), follow: 1, az: 7, el: 4, dist: 0.13, fov: 36, roll: 1.5 },
  // VI · El colapso — empuje, golpe de campo de visión y plano que se aleja en la oscuridad.
  { t: T.colapso + 0.18, at: bed(COLLAPSE_Y), follow: 0, az: 6, el: 3, dist: 0.115, fov: 56, roll: -1.5 },
  { t: T.colapso + 1.4, at: bed(COLLAPSE_Y), follow: 0, az: 4, el: 2, dist: 0.2, fov: 46, roll: 0 },
  { t: T.colapso + 4.9, at: bed(COLLAPSE_Y - 0.03), follow: 0, az: 2, el: 0, dist: 0.26, fov: 45 },
  // VII · 367 días — el fondo, a 907 m.
  { t: T.hallazgo + 0.9, at: bed(-0.86), follow: 0, az: 6, el: 8, dist: 0.2, fov: 45 },
  { t: T.hallazgo + 3.1, at: bed(-0.888), follow: 0, az: -22, el: 15, dist: 0.18 },
  { t: T.hallazgo + 4.8, at: bed(-0.884), follow: 0, az: -36, el: 12, dist: 0.2 },
  // Ascenso con las 44 luces.
  { t: T.distancia + 0.4, at: bed(-0.45), follow: 0, az: -44, el: -8, dist: 0.28 },
  { t: T.distancia + 1.5, at: bed(-0.02), follow: 0, az: -40, el: -14, dist: 0.36 },
  // VIII · Memoria — se abre el mapa: 91 km entre la última coordenada y los restos.
  { t: T.distancia + 2.4, at: bed(0.006), follow: 0, az: -22, el: 8, dist: 3.6 },
  { t: T.distancia + 4.1, at: midWreck(0.6), follow: 0, az: 8, el: 50, dist: 260 },
  { t: T.end, at: midWreck(0.55), follow: 0, az: 18, el: 52, dist: 285 },
];

const K = (f: (k: ShotKey) => number): Key[] => SHOTS.map((k) => [k.t, f(k)] as const);

// El ancla de las tomas que siguen al submarino queda definida igual: se usa la posición del submarino en esa clave.
const subAnchor = (k: ShotKey) => (k.follow >= 1 ? subAt(k.t).pos : (k.at ?? A.argentina));

const trX = track(SHOTS.map((k) => [k.t, subAnchor(k).x] as const));
const trY = track(SHOTS.map((k) => [k.t, subAnchor(k).y] as const));
const trZ = track(SHOTS.map((k) => [k.t, subAnchor(k).z] as const));
const trFollow = track(K((k) => k.follow));
const trAz = track(K((k) => k.az));
const trEl = track(K((k) => k.el));
const trLogDist = track(K((k) => Math.log(k.dist)));
const trFov = track(K((k) => k.fov ?? 45));
const trRoll = track(K((k) => k.roll ?? 0));

let cacheT = NaN;
let cache: CamState | null = null;

export function cameraAt(t: number): CamState {
  if (t === cacheT && cache) return cache;
  const follow = clamp(trFollow(t));
  const anchor = V(trX(t), trY(t), trZ(t));
  const sub = subAt(t);
  const focus = follow >= 0.999 ? sub.pos.clone() : anchor.lerp(sub.pos, follow);
  // Respiración de cámara en mano: apenas perceptible, más en el temporal.
  const storm = seg(t, T.c2342 - 1, T.c2342 + 1) * (1 - seg(t, T.c0600 + 1, T.c0719));
  const roll = trRoll(t) + wobble(t * 0.8, 9) * (0.12 + 0.9 * storm);
  cacheT = t;
  cache = {
    focus,
    az: trAz(t),
    el: trEl(t),
    dist: Math.exp(trLogDist(t)),
    fov: trFov(t),
    roll,
    follow,
  };
  return cache;
}

const D2R = Math.PI / 180;

/** Posición de la cámara a partir de un estado (con desvíos opcionales del usuario). */
export function cameraPosition(c: CamState, dAz = 0, dEl = 0, zoom = 1, out = new THREE.Vector3()) {
  const az = (c.az + dAz) * D2R;
  const el = clamp(c.el + dEl, -88, 88) * D2R;
  const d = c.dist * zoom;
  return out.set(
    c.focus.x + d * Math.sin(az) * Math.cos(el),
    c.focus.y + d * Math.sin(el),
    c.focus.z + d * Math.cos(az) * Math.cos(el),
  );
}

/** Planos de recorte según la distancia al foco: del mapa entero a los 30 m del casco sin z-fighting. */
export function clipFor(dist: number) {
  return { near: Math.max(0.00005, dist * 0.02), far: dist * 90 + 30 };
}

/** Relieve a escala real (1) o exagerado (0) según la distancia: al acercarse al mar el fondo se aplana hasta 1:1. */
export function trueScaleAt(dist: number) {
  const x = clamp((Math.log(dist) - Math.log(6)) / (Math.log(180) - Math.log(6)));
  const s = x * x * (3 - 2 * x);
  return 1 - s;
}

/** Escala del símbolo del submarino (km por metro de modelo): 1:1 de cerca y proporcional a la distancia de lejos. */
export function symbolScale(dist: number) {
  const TRUE = 0.001;
  const lengthKm = dist * 0.075;
  return Math.max(TRUE, lengthKm / 65.93);
}

export { lerp };
