import { POS_HALLAZGO } from '../data/positions';

/**
 * Marcos de referencia de la escena 3D. Hay dos «mundos» con escalas distintas:
 *
 * MAPA   1 unidad = 1 km. Proyección Mercator con escala real en la latitud central.
 *        x = este, z = sur (el norte queda hacia el fondo de la pantalla).
 *        El relieve se exagera MAP_VEXAG veces bajo el mar y MAP_VEXAG_LAND en tierra
 *        (la tierra es contexto; exagerarla igual la vuelve escalonada). Se indica en pantalla.
 * PROFUNDIDAD  1 unidad = 1 m, escala real en las tres dimensiones, centrado en la
 *        coordenada publicada del hallazgo. y = 0 es la superficie del mar.
 */
const R = 6371.0088;
const RAD = Math.PI / 180;

export const MAP_CENTER = { lat: -46, lon: -62 };
export const MAP_VEXAG = 25;
export const MAP_VEXAG_LAND = 8;

const K = Math.cos(MAP_CENTER.lat * RAD);
const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
const Y0 = merc(MAP_CENTER.lat);

export function mapXZ(lat: number, lon: number): [number, number] {
  return [R * (lon - MAP_CENTER.lon) * RAD * K, -R * (merc(lat) - Y0) * K];
}

/** Elevación GEBCO (m) → altura en el mapa (km exagerados). */
export const elevToMapY = (elevM: number) => (elevM / 1000) * (elevM < 0 ? MAP_VEXAG : MAP_VEXAG_LAND);

export function mapPoint(lat: number, lon: number, elevM = 0): [number, number, number] {
  const [x, z] = mapXZ(lat, lon);
  return [x, elevToMapY(elevM), z];
}

/** Mundo de profundidad: metros locales alrededor del hallazgo. */
export function localXZ(lat: number, lon: number): [number, number] {
  const mPerDegLat = 110574;
  const mPerDegLon = 111320 * Math.cos(POS_HALLAZGO.lat * RAD);
  return [(lon - POS_HALLAZGO.lon) * mPerDegLon, -(lat - POS_HALLAZGO.lat) * mPerDegLat];
}

export function localPoint(lat: number, lon: number, elevM: number): [number, number, number] {
  const [x, z] = localXZ(lat, lon);
  return [x, elevM, z];
}
