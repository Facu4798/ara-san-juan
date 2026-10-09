import * as THREE from 'three';
import { ROUTE_OUT, ROUTE_BACK, VOYAGE_TIMING } from '../data/route';
import type { RouteNode } from '../data/types';
import { mapPoint } from './geoFrame';

/** Altura del trazado sobre el agua (km), para que no quede tapado por la superficie. */
const LIFT = 0.8;

interface Polyline {
  pts: THREE.Vector3[];
  /** Distancia acumulada hasta cada punto. */
  acc: number[];
  total: number;
}

/** Polilínea densificada (un punto cada ~15 km) en el plano del mapa. */
function polyline(nodes: RouteNode[]): Polyline {
  const pts: THREE.Vector3[] = [];
  for (let i = 1; i < nodes.length; i++) {
    const a = new THREE.Vector3(...mapPoint(nodes[i - 1].lat, nodes[i - 1].lon)).setY(LIFT);
    const b = new THREE.Vector3(...mapPoint(nodes[i].lat, nodes[i].lon)).setY(LIFT);
    const steps = Math.max(1, Math.ceil(a.distanceTo(b) / 15));
    for (let s = i === 1 ? 0 : 1; s <= steps; s++) pts.push(a.clone().lerp(b, s / steps));
  }
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
  const d = f * line.total;
  let i = 1;
  while (i < line.acc.length - 1 && line.acc[i] < d) i++;
  const t = (d - line.acc[i - 1]) / Math.max(1e-6, line.acc[i] - line.acc[i - 1]);
  const pos = line.pts[i - 1].clone().lerp(line.pts[i], Math.min(1, Math.max(0, t)));
  const dir = line.pts[i].clone().sub(line.pts[i - 1]);
  // Giro sobre Y para un modelo cuya proa apunta a +x.
  return { pos, yaw: Math.atan2(-dir.z, dir.x), index: i };
}

/** Estado del viaje para un avance p del momento «viaje». */
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
