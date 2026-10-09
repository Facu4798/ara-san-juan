import * as THREE from 'three';
import { POS_0028, POS_CTBTO, POS_HALLAZGO, COAST_NEAREST_0028 } from '../data/positions';
import { descentDepth } from '../story/descent';
import { WRECK_DEPTH_M } from '../data/depth';
import { mapPoint } from './geoFrame';
import { voyageAt } from './routePath';

/**
 * COREOGRAFÍA DE CÁMARA. Para cada momento y su avance p (0 a 1) devuelve posición y punto
 * de mira. Es una función pura: el mismo p da siempre la misma toma, venga del scroll,
 * del teclado o de la reproducción automática. CameraRig suaviza el movimiento.
 */
export interface Shot {
  pos: THREE.Vector3;
  target: THREE.Vector3;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const P = (lat: number, lon: number) => V(...mapPoint(lat, lon));
const smooth = (t: number) => t * t * (3 - 2 * t);
const seg = (p: number, a: number, b: number) => smooth(Math.min(1, Math.max(0, (p - a) / (b - a))));
const lerpV = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t);

// Puntos clave en el mapa (km).
const p0028 = P(POS_0028.lat, POS_0028.lon);
const ctbto = P(POS_CTBTO.lat, POS_CTBTO.lon);
const wreck = P(POS_HALLAZGO.lat, POS_HALLAZGO.lon);
const coast = P(COAST_NEAREST_0028.lat, COAST_NEAREST_0028.lon);
const argentina = P(-45, -63);

/**
 * Eje x de la cámara en el mundo de profundidad (m al este del hallazgo). Queda a la derecha
 * del grupo restos + siluetas, así el grupo se ve en el área libre entre la tarjeta y el carril.
 */
const GROUP_X = 200;

/** Toma relativa: punto de mira + desplazamiento de cámara. */
const rel = (target: THREE.Vector3, off: THREE.Vector3): Shot => ({ pos: target.clone().add(off), target });

function mapShot(id: string, p: number): Shot {
  switch (id) {
    case 'contexto':
      return rel(argentina, lerpV(V(0, 2500, 1700), V(0, 2150, 1450), p));
    case 'viaje': {
      // La cámara sigue al submarino-símbolo, sin perder el contexto de la costa.
      const sub = voyageAt(p).pos;
      const target = lerpV(argentina, sub, 0.72);
      return rel(target, V(0, 1250, 1050));
    }
    case 'c2342':
      return rel(p0028, lerpV(V(220, 700, 760), V(160, 560, 620), p));
    case 'c0028': {
      const mid = lerpV(p0028, coast, 0.45);
      return rel(lerpV(p0028, mid, seg(p, 0.1, 0.5)), lerpV(V(80, 520, 600), V(0, 640, 700), seg(p, 0.1, 0.6)));
    }
    case 'c0600':
      return rel(p0028, lerpV(V(110, 260, 330), V(70, 190, 260), p));
    case 'c0719':
      return rel(p0028, lerpV(V(70, 190, 260), V(30, 230, 330), p));
    case 'silencio': {
      // Se aleja para mostrar el alcance hipotético y el evento; al final baja hacia el agua.
      const t = lerpV(p0028, lerpV(p0028, ctbto, 0.5), seg(p, 0.5, 0.8));
      const off = lerpV(V(0, 360, 380), V(0, 300, 320), seg(p, 0, 0.6));
      return rel(t, lerpV(off, V(0, 14, 30), seg(p, 0.86, 1)));
    }
    case 'distancia': {
      const mid = lerpV(p0028, wreck, 0.5);
      return rel(mid, lerpV(V(40, 150, 165), V(0, 135, 150), p));
    }
    default:
      return rel(argentina, V(0, 2300, 1500));
  }
}

function depthShot(id: string, p: number): Shot {
  switch (id) {
    case 'memorial':
      return { pos: lerpV(V(0, 7, 96), V(0, 9, 86), p), target: V(0, 1.5, 0) };
    case 'descenso': {
      const d = descentDepth(p);
      if (d < 0.5) {
        // Comparación justo bajo la superficie: submarino y Obelisco a escala, lado a lado.
        return { pos: lerpV(V(30, -14, 100), V(8, -16, 118), seg(p, 0, 0.14)), target: V(0, -16, 0) };
      }
      // Siempre bajo el agua, mirando un poco hacia abajo: las siluetas aparecen desde el fondo.
      const k = d / WRECK_DEPTH_M;
      return { pos: V(GROUP_X, -d - 10 + 50 * k, 470 + 330 * k), target: V(GROUP_X, -d - 60 + 30 * k, 0) };
    }
    case 'hallazgo': {
      // Plano abierto: el fondo, los restos y las siluetas completas bajo la superficie.
      const t = seg(p, 0.1, 0.85);
      return {
        pos: lerpV(V(GROUP_X, -860, 800), V(GROUP_X + 300, -420, 1300), t),
        target: lerpV(V(GROUP_X, -890, 0), V(GROUP_X, -460, 0), t),
      };
    }
    case 'cierre':
      return { pos: lerpV(V(0, 12, 110), V(0, 8, 92), p), target: V(0, 2, 0) };
    default:
      return { pos: V(0, 8, 95), target: V(0, 1.5, 0) };
  }
}

function conceptShot(p: number): Shot {
  const a = 0.35 + p * 0.3;
  return { pos: V(Math.sin(a) * 30, 5, Math.cos(a) * 30), target: V(0, 0, 0) };
}

export function shotFor(world: 'map' | 'depth' | 'concept', id: string, p: number): Shot {
  if (world === 'map') return mapShot(id, p);
  if (world === 'depth') return depthShot(id, p);
  return conceptShot(p);
}

/** Planos de recorte por mundo (unidades distintas: km o m). */
export const CLIP = {
  map: { near: 2, far: 12000 },
  depth: { near: 0.5, far: 9000 },
  concept: { near: 0.1, far: 500 },
} as const;
