import * as THREE from 'three';
import { ROUTE_OUT, ROUTE_BACK, VOYAGE_TIMING } from '../data/route';
import type { RouteNode } from '../data/types';
import { mapPoint } from './geoFrame';

/** Altura del trazado sobre el agua (km), para que no quede tapado por la superficie. */
const LIFT = 0.8;

export interface Polyline {
  pts: THREE.Vector3[];
  /** Distancia acumulada hasta cada punto. */
  acc: number[];
  total: number;
}

/**
 * Trazado suave a partir de los nodos del viaje: curva Catmull-Rom centrípeta (no se pasa de los
 * nodos, así que los lugares documentados quedan exactamente sobre la línea) muestreada cada ~6 km.
 * Así el rumbo del submarino cambia de forma continua en lugar de «quebrarse» en cada nodo.
 */
function polyline(nodes: RouteNode[]): Polyline {
  const ctrl = nodes.map((n) => new THREE.Vector3(...mapPoint(n.lat, n.lon)).setY(LIFT));
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  const steps = Math.max(2, Math.ceil(curve.getLength() / 6));
  const pts = curve.getSpacedPoints(steps);
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, acc, total: acc[acc.length - 1] };
}

export const OUT = polyline(ROUTE_OUT);
export const BACK = polyline(ROUTE_BACK);

const smooth = (t: number) => t * t * (3 - 2 * t);
const frac = (p: number, [a, b]: readonly [number, number]) => Math.min(1, Math.max(0, (p - a) / (b - a)));

/** Punto y rumbo a una fracción f (0 a 1) del recorrido de la polilínea. */
export function along(line: Polyline, f: number) {
  const d = Math.min(1, Math.max(0, f)) * line.total;
  let lo = 1;
  let hi = line.acc.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (line.acc[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  const i = lo;
  const t = (d - line.acc[i - 1]) / Math.max(1e-6, line.acc[i] - line.acc[i - 1]);
  const pos = line.pts[i - 1].clone().lerp(line.pts[i], Math.min(1, Math.max(0, t)));
  // El rumbo se promedia en una ventana de ±3 muestras (~36 km): sin vibraciones.
  const a = line.pts[Math.max(0, i - 4)];
  const b = line.pts[Math.min(line.pts.length - 1, i + 3)];
  const dir = b.clone().sub(a);
  // Giro sobre Y para un modelo cuya proa apunta a +x.
  return { pos, yaw: Math.atan2(-dir.z, dir.x), index: i };
}

/** Estado del viaje para un avance p del momento «viaje» (lo usa el módulo de exploración). */
export function voyageAt(p: number) {
  const fOut = smooth(frac(p, VOYAGE_TIMING.out));
  const fBack = smooth(frac(p, VOYAGE_TIMING.back));
  const onBack = p >= VOYAGE_TIMING.back[0];
  const at = onBack ? along(BACK, fBack) : along(OUT, fOut);
  return { ...at, fOut, fBack, onBack };
}

/** Sub-polilínea desde el inicio hasta la fracción f (la estela dibujada). */
export function trail(line: Polyline, f: number): THREE.Vector3[] {
  if (f <= 0) return [];
  const { pos, index } = along(line, f);
  return [...line.pts.slice(0, index), pos];
}
