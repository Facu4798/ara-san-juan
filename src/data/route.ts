import type { RouteNode } from './types';
import { POS_0028, positionById } from './positions';

/**
 * TRAZADO ESQUEMÁTICO DEL VIAJE (no es el recorrido real, que nunca se publicó).
 *
 * Une con líneas los lugares documentados —Mar del Plata (25/10), Ushuaia (4 al 8/11) y la
 * coordenada de las 00:28 del 15/11— pasando por puntos de paso propios (`esquematico: true`)
 * elegidos sólo para que la línea no cruce tierra: alta mar, el estrecho de Le Maire y el
 * canal de Beagle. scripts/verify-data.mjs comprueba que cada tramo quede en el mar.
 */
const mdp = positionById.get('mar-del-plata')!;
const ush = positionById.get('ushuaia')!;
const REQ = ['infobae2026requerimiento'];

const beagle: RouteNode[] = [
  { id: 'beagle-1', lat: -54.835, lon: -68.25, esquematico: true },
  { id: 'beagle-2', lat: -54.86, lon: -68.0, esquematico: true },
  { id: 'beagle-3', lat: -54.93, lon: -67.3, esquematico: true },
  { id: 'beagle-4', lat: -54.97, lon: -67.0, esquematico: true },
  { id: 'beagle-5', lat: -55.07, lon: -66.85, esquematico: true },
  { id: 'beagle-6', lat: -55.07, lon: -66.0, esquematico: true },
  { id: 'le-maire-s', lat: -54.95, lon: -65.1, esquematico: true },
  { id: 'le-maire-n', lat: -54.4, lon: -64.85, esquematico: true },
];

/** Mar del Plata → Ushuaia. */
export const ROUTE_OUT: RouteNode[] = [
  { id: 'mdp', lat: mdp.lat, lon: mdp.lon, esquematico: false, label: 'Mar del Plata', fecha: '25 oct. 2017', sourceIds: REQ },
  { id: 'alta-mar-1', lat: -38.9, lon: -56.9, esquematico: true },
  { id: 'alta-mar-2', lat: -44.5, lon: -60.0, esquematico: true },
  { id: 'alta-mar-3', lat: -51.5, lon: -64.0, esquematico: true },
  ...[...beagle].reverse(),
  { id: 'ushuaia', lat: ush.lat, lon: ush.lon, esquematico: false, label: 'Ushuaia', fecha: '4 al 8 nov. 2017', sourceIds: REQ },
];

/** Ushuaia → coordenada de las 00:28 (la patrulla en la zona «Juliana» no tiene recorrido publicado). */
export const ROUTE_BACK: RouteNode[] = [
  ROUTE_OUT[ROUTE_OUT.length - 1],
  ...beagle,
  { id: 'alta-mar-4', lat: -50.0, lon: -62.0, esquematico: true },
  { id: 'pos-0028', lat: POS_0028.lat, lon: POS_0028.lon, esquematico: false, label: 'Zona de patrulla', fecha: '8 al 15 nov. 2017', sourceIds: REQ },
];

/**
 * Cronometraje del viaje dentro de su momento del relato (p de 0 a 1).
 * Las paradas corresponden a lugares y fechas documentados.
 */
export const VOYAGE_TIMING = {
  holdMdp: [0, 0.12],
  out: [0.12, 0.46],
  holdUshuaia: [0.46, 0.6],
  back: [0.6, 0.92],
  holdEnd: [0.92, 1],
} as const;

export type VoyageStop = 'mdp' | 'navegando-1' | 'ushuaia' | 'navegando-2' | 'patrulla';

export function voyageStop(p: number): VoyageStop {
  const T = VOYAGE_TIMING;
  if (p < T.out[0]) return 'mdp';
  if (p < T.holdUshuaia[0]) return 'navegando-1';
  if (p < T.back[0]) return 'ushuaia';
  if (p < T.holdEnd[0]) return 'navegando-2';
  return 'patrulla';
}

/** Rótulo de fecha documentada para cada tramo (nunca se interpolan fechas). */
export const VOYAGE_LABEL: Record<VoyageStop, { fecha: string; lugar: string }> = {
  mdp: { fecha: '25 oct. 2017', lugar: 'Zarpa de Mar del Plata' },
  'navegando-1': { fecha: '25 oct. → 4 nov.', lugar: 'Rumbo a Ushuaia' },
  ushuaia: { fecha: '4 al 8 nov.', lugar: 'Escala en Ushuaia · ejercicios en el canal de Beagle' },
  'navegando-2': { fecha: '8 nov. →', lugar: 'Sale a patrullar el Mar Argentino' },
  patrulla: { fecha: '10 al 14 nov.', lugar: 'Maniobras con la flota y patrulla en la zona «Juliana»' },
};
