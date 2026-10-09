import * as THREE from 'three';
import type { Env } from './env';
import type { CamState } from './camera';

/**
 * Estado «en vivo» de la película, calculado una vez por cuadro por el director (JourneyRig) y leído
 * por todo lo demás: partículas, indicadores, sonido. Evita recalcular cámara y entorno en cada consumidor.
 */
export const live = {
  t: 0,
  env: null as Env | null,
  cam: null as CamState | null,
  /** Posición real de la cámara (km). */
  camPos: new THREE.Vector3(),
  /** Desvíos de mirada libre del usuario: azimut, elevación (grados) y zoom (multiplicador). */
  look: { dAz: 0, dEl: 0, zoom: 1, active: false },
  /** Dónde cae el punto del colapso en la pantalla (coordenadas normalizadas, −1 a 1). */
  collapseNdc: { x: 0, y: 0 },
};
