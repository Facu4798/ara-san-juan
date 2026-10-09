import * as THREE from 'three';
import { contours } from 'd3';
import type { Grid } from '../data/types';

type ToPos = (lat: number, lon: number, elevM: number) => [number, number, number];

/**
 * Malla de relieve a partir de una grilla GEBCO (filas = latitudes ascendentes).
 * El color de cada vértice CODIFICA la elevación (paleta hipsométrica / batimétrica).
 */
export function gridMesh(
  g: Grid,
  toPos: ToPos,
  color: (elevM: number, out: THREE.Color, row: number, col: number) => void,
  /** Desvanece el color hacia el fondo en las últimas `cells` filas/columnas: oculta el corte de la grilla. */
  edgeFade?: { cells: number; color: string },
) {
  const n = g.rows * g.cols;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const c = new THREE.Color();
  const fade = edgeFade ? new THREE.Color(edgeFade.color) : null;
  for (let r = 0; r < g.rows; r++) {
    for (let col = 0; col < g.cols; col++) {
      const i = r * g.cols + col;
      const e = g.elevation[i];
      positions.set(toPos(g.lats[r], g.lons[col], e), i * 3);
      color(e, c, r, col);
      if (fade && edgeFade) {
        const d = Math.min(r, g.rows - 1 - r, col, g.cols - 1 - col);
        const t = Math.min(1, d / edgeFade.cells);
        c.lerp(fade, 1 - t * t * (3 - 2 * t));
      }
      colors.set([c.r, c.g, c.b], i * 3);
    }
  }
  const index: number[] = [];
  for (let r = 0; r < g.rows - 1; r++) {
    for (let col = 0; col < g.cols - 1; col++) {
      const a = r * g.cols + col, b = a + 1, cc = a + g.cols, d = cc + 1;
      // Orden antihorario visto desde arriba (filas hacia el norte = z negativo).
      index.push(a, b, cc, b, d, cc);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setIndex(index);
  geom.computeVertexNormals();
  return geom;
}

/** Isóbatas reales (marching squares de d3) como segmentos 3D, en una sola geometría. */
export function gridContours(g: Grid, thresholds: number[], toPos: ToPos, lift = 0) {
  const sets = contours().size([g.cols, g.rows]).thresholds(thresholds)(g.elevation);
  const pts: number[] = [];
  const onBorder = (x: number, y: number) => x <= 0 || y <= 0 || x >= g.cols || y >= g.rows;
  const toLatLon = (x: number, y: number): [number, number] => {
    const fy = Math.min(g.rows - 1, Math.max(0, y - 0.5));
    const fx = Math.min(g.cols - 1, Math.max(0, x - 0.5));
    return [g.lats[0] + fy * (g.lats[1] - g.lats[0]), g.lons[0] + fx * (g.lons[1] - g.lons[0])];
  };
  for (const mp of sets) {
    for (const poly of mp.coordinates) {
      for (const ring of poly) {
        for (let i = 1; i < ring.length; i++) {
          const [x0, y0] = ring[i - 1], [x1, y1] = ring[i];
          if (onBorder(x0, y0) && onBorder(x1, y1)) continue;
          const [la0, lo0] = toLatLon(x0, y0), [la1, lo1] = toLatLon(x1, y1);
          const a = toPos(la0, lo0, mp.value), b = toPos(la1, lo1, mp.value);
          pts.push(a[0], a[1] + lift, a[2], b[0], b[1] + lift, b[2]);
        }
      }
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geom;
}

/** Interpolación lineal por tramos entre colores. */
export function ramp(stops: [number, string][]) {
  const cs = stops.map(([v, hex]) => [v, new THREE.Color(hex)] as const);
  return (v: number, out: THREE.Color) => {
    if (v <= cs[0][0]) return out.copy(cs[0][1]);
    for (let i = 1; i < cs.length; i++) {
      if (v <= cs[i][0]) {
        const t = (v - cs[i - 1][0]) / (cs[i][0] - cs[i - 1][0]);
        return out.copy(cs[i - 1][1]).lerp(cs[i][1], t);
      }
    }
    return out.copy(cs[cs.length - 1][1]);
  };
}

/**
 * Paleta del mapa: el color codifica la elevación.
 * Mar: celeste en la plataforma (< 200 m), azul en el talud, petróleo en la llanura abisal.
 * Tierra: grises y arenas apagados, más claros con la altura (Andes).
 */
const sea = ramp([
  [-6000, '#0f2b3b'],
  [-3000, '#183f55'],
  [-1000, '#255870'],
  [-200, '#3f7c94'],
  [-60, '#5e97ab'],
  [0, '#7cadbd'],
]);
const land = ramp([
  [0, '#5e6964'],
  [300, '#6d746a'],
  [1200, '#837f72'],
  [3000, '#a29f95'],
  [4600, '#d6d8d4'],
]);
export const hypsometric = (e: number, out: THREE.Color) => (e < 0 ? sea(e, out) : land(e, out));

/** Valor de la grilla por interpolación bilineal (latitudes y longitudes ascendentes). */
export function sampleGrid(g: Grid, lat: number, lon: number): number {
  const dLat = g.lats[1] - g.lats[0];
  const dLon = g.lons[1] - g.lons[0];
  const fy = Math.min(Math.max((lat - g.lats[0]) / dLat, 0), g.rows - 1.0001);
  const fx = Math.min(Math.max((lon - g.lons[0]) / dLon, 0), g.cols - 1.0001);
  const y0 = Math.floor(fy), x0 = Math.floor(fx);
  const ty = fy - y0, tx = fx - x0;
  const v = (y: number, x: number) => g.elevation[y * g.cols + x];
  return v(y0, x0) * (1 - tx) * (1 - ty) + v(y0, x0 + 1) * tx * (1 - ty) + v(y0 + 1, x0) * (1 - tx) * ty + v(y0 + 1, x0 + 1) * tx * ty;
}
