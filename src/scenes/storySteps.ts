import type { Certainty } from '../data/types';
import { POS_0028, POS_CTBTO, POS_HALLAZGO, positionById, HYPOTHESIS_SPEED } from '../data/positions';
import { distanceKm } from '../utils/geo';
import { fmt0 } from '../utils/format';
import { searchFacts2017 } from '../data/search';

export type BBox = [number, number, number, number]; // [oeste, sur, este, norte]

export interface MapStepState {
  bbox: BBox;
  /** Hora mostrada en el reloj (ISO). */
  clock?: string;
  clockPrecision?: 'minuto' | 'dia';
  refs?: boolean;
  p0028?: 'crisp' | 'aged' | 'faint';
  ctbto?: 'on' | 'faint';
  /** Horas desde 00:28 para la hipótesis de alcance [inicio, fin del paso]. */
  hypothesisHours?: [number, number];
  /** Días desde el 15/11/2017 [inicio, fin del paso]. */
  counterDays?: [number, number];
  /** Rango temporal de posiciones del buque de búsqueda [desde, hasta-inicio, hasta-fin]. */
  secoRange?: [string, string, string];
  secoHighlight?: string;
  wreck?: boolean;
  distances?: boolean;
  dim?: boolean;
  headingDeg?: number;
  stats?: boolean;
}

export interface StoryStep {
  id: string;
  chapter: string;
  eyebrow: string;
  title: string;
  body: string[];
  big?: string;
  note?: string;
  certainty?: Certainty;
  sourceIds: string[];
  map: MapStepState;
}

const REQ = 'infobae2026requerimiento';
const mdp = positionById.get('mar-del-plata')!;
const seco128 = positionById.get('seco-128')!;

const H_0028_TO = (iso: string) => (Date.parse(iso) - Date.parse(POS_0028.datetime!)) / 3.6e6;

export const DIST = {
  mdp: distanceKm(POS_0028, mdp),
  ctbto: distanceKm(POS_0028, POS_CTBTO),
  wreck: distanceKm(POS_0028, POS_HALLAZGO),
  wreckCtbto: distanceKm(POS_HALLAZGO, POS_CTBTO),
  seco128: distanceKm(seco128, POS_HALLAZGO),
};

const kmAt = (h: number) => h * HYPOTHESIS_SPEED.kmPorHora;

const OVERVIEW: BBox = [-73, -56.5, -49, -33.5];
const PATROL: BBox = [-67.5, -49.8, -53.5, -42.2];
const SITE: BBox = [-61.4, -47.2, -58.6, -45.35];
const NORTH: BBox = [-64.5, -47.6, -54.5, -41.2];

const stat = (id: string) => searchFacts2017.find((f) => f.id === id)!;

export const storySteps: StoryStep[] = [
  {
    id: 'viaje', chapter: '01 · El viaje', eyebrow: '25 oct. — 8 nov. 2017',
    title: 'Mar del Plata → Ushuaia → patrulla',
    body: ['Zarpó el 25 de octubre de 2017 con 44 tripulantes. El 8 de noviembre salió de Ushuaia hacia su área de patrulla.'],
    note: 'El recorrido no fue publicado: sólo lugares y fechas.',
    certainty: 'hecho', sourceIds: [REQ],
    map: { bbox: OVERVIEW, refs: true, clock: '2017-10-25T12:00:00-03:00', clockPrecision: 'dia' },
  },
  {
    id: 'c2342', chapter: '02 · Las últimas horas', eyebrow: '14 nov. · 23:42',
    title: '«Principio de incendio controlado»',
    body: ['En superficie, ventilando. Rumbo 080°, 5 nudos, con temporal.'],
    note: 'Esta comunicación no tiene posición publicada: el mapa sigue vacío.',
    certainty: 'hecho', sourceIds: [REQ],
    map: { bbox: PATROL, refs: true, clock: '2017-11-14T23:42:00-03:00', headingDeg: 80 },
  },
  {
    id: 'c0028', chapter: '02 · Las últimas horas', eyebrow: '15 nov. · 00:28',
    title: 'La última coordenada',
    big: '46°44′S · 60°08′O',
    body: [`Posición GPS por teléfono satelital. A ${fmt0(DIST.mdp)} km de Mar del Plata.`],
    note: 'Única posición publicada de esas horas. Distancia: cálculo propio.',
    certainty: 'hecho', sourceIds: [REQ],
    map: { bbox: PATROL, refs: true, p0028: 'crisp', clock: '2017-11-15T00:28:00-03:00' },
  },
  {
    id: 'c0600', chapter: '02 · Las últimas horas', eyebrow: '15 nov. · 06:00',
    title: 'Agua en el tanque de baterías N.º 3',
    body: ['«Ocasionó cortocircuito y principio de incendio… Al momento en inmersión propulsando con circuito dividido. Sin novedades de personal».'],
    note: 'Sin posición publicada.',
    certainty: 'hecho', sourceIds: [REQ],
    map: { bbox: SITE, p0028: 'crisp', clock: '2017-11-15T06:00:00-03:00' },
  },
  {
    id: 'c0719', chapter: '02 · Las últimas horas', eyebrow: '15 nov. · 07:19',
    title: 'Última comunicación',
    big: '18 m',
    body: ['Plano de periscopio, rumbo 015°. Iba a bajar a 40 metros.'],
    note: `No se publicó dónde estaba. El área rayada es una hipótesis: ${HYPOTHESIS_SPEED.nudos} nudos en cualquier dirección.`,
    certainty: 'hecho', sourceIds: [REQ],
    map: { bbox: SITE, p0028: 'aged', clock: '2017-11-15T07:19:00-03:00', headingDeg: 15, hypothesisHours: [H_0028_TO('2017-11-15T07:19:00-03:00'), H_0028_TO('2017-11-15T07:19:00-03:00')] },
  },
  {
    id: 'sin-respuesta', chapter: '03 · El silencio', eyebrow: '08:27 · 09:35',
    title: 'Sin respuesta',
    body: ['Dos órdenes más desde tierra. «Nunca hubo respuesta».'],
    note: `Alcance hipotético: ${fmt0(kmAt(H_0028_TO('2017-11-15T08:27:00-03:00')))} → ${fmt0(kmAt(H_0028_TO('2017-11-15T09:35:00-03:00')))} km.`,
    certainty: 'hecho', sourceIds: [REQ],
    map: { bbox: SITE, p0028: 'aged', clock: '2017-11-15T09:35:00-03:00', hypothesisHours: [H_0028_TO('2017-11-15T08:27:00-03:00'), H_0028_TO('2017-11-15T09:35:00-03:00')] },
  },
  {
    id: 'ctbto', chapter: '03 · El silencio', eyebrow: '15 nov. · 10:51',
    title: 'Un evento a miles de kilómetros',
    body: [`Dos hidrófonos del CTBTO registran un evento impulsivo. La estimación queda a ${fmt0(DIST.ctbto)} km de la última coordenada.`],
    note: 'Estimación por triangulación. Las elipses de error publicadas no traen centro ni orientación: no se dibujan.',
    certainty: 'estimacion', sourceIds: ['ctbto2017', 'dallosto2019'],
    map: { bbox: SITE, p0028: 'aged', ctbto: 'on', clock: '2017-11-15T10:51:00-03:00', hypothesisHours: [H_0028_TO('2017-11-15T10:51:00-03:00'), H_0028_TO('2017-11-15T10:51:00-03:00')] },
  },
  {
    id: 'silencio', chapter: '03 · El silencio', eyebrow: 'Día 0 → día 367',
    title: 'El tiempo sigue. La posición, no.',
    body: ['No hubo otra coordenada del ARA San Juan durante 367 días.'],
    note: 'Sin datos, cualquier área dibujada sería inventada.',
    sourceIds: [REQ],
    map: { bbox: PATROL, p0028: 'faint', ctbto: 'faint', dim: true, counterDays: [0, 120], clockPrecision: 'dia' },
  },
  {
    id: 'busqueda', chapter: '04 · La búsqueda', eyebrow: 'Desde el 15 nov. 2017',
    title: 'Buscar sin coordenada',
    body: [
      `${stat('paises').valor} países · +${fmt0(stat('personas').valor)} personas · ${stat('buques').valor} buques · ${stat('aeronaves').valor} aeronaves.`,
      `${stat('contactos').valor} contactos investigados en 120 días. Ninguno era el submarino.`,
    ],
    note: 'Las zonas de búsqueda de 2017 no se publicaron.',
    certainty: 'hecho', sourceIds: ['armadaMicrositio2018'],
    map: { bbox: PATROL, p0028: 'faint', ctbto: 'faint', dim: true, counterDays: [120, 297], clockPrecision: 'dia', stats: true },
  },
  {
    id: 'seco', chapter: '04 · La búsqueda', eyebrow: '8 sept. — 13 nov. 2018',
    title: 'Cinco vehículos autónomos',
    body: ['Cada cuadrado es la posición del buque de búsqueda en un parte oficial de la Armada.'],
    note: '36 partes recuperados, 19 con coordenada. No se unen: no conocemos el recorrido entre uno y otro.',
    certainty: 'hecho', sourceIds: ['armadaPartes2018', 'oceanInfinity2018inicio'],
    map: { bbox: SITE, p0028: 'faint', ctbto: 'faint', secoRange: ['2018-09-01T00:00:00-03:00', '2018-09-09T06:00:00-03:00', '2018-11-13T06:00:00-03:00'], clockPrecision: 'dia' },
  },
  {
    id: 'sitio2', chapter: '04 · La búsqueda', eyebrow: '14 nov. 2018 · 06:00',
    title: 'El buque se va al norte',
    big: '42°49′ S',
    body: [`Se reposiciona hacia el Sitio 2, a ${fmt0(DIST.seco128)} km de donde estaba el submarino.`],
    certainty: 'hecho', sourceIds: ['armadaPartes2018'],
    map: { bbox: NORTH, p0028: 'faint', ctbto: 'faint', secoRange: ['2018-09-01T00:00:00-03:00', '2018-11-14T06:00:00-03:00', '2018-11-14T06:00:00-03:00'], secoHighlight: 'seco-128', clock: '2018-11-14T06:00:00-03:00', clockPrecision: 'minuto' },
  },
  {
    id: 'poi24', chapter: '04 · La búsqueda', eyebrow: '15 nov. 2018 · 22:15',
    title: 'Punto de interés N.º 24',
    body: ['Sitio 1, área 15A-4: «a unos 800 metros de profundidad y 60 m de longitud». El buque vuelve.'],
    note: 'Un año exacto después de la desaparición. La hora figura en el Parte N.º 132.',
    certainty: 'hecho', sourceIds: ['armadaPartes2018'],
    map: { bbox: NORTH, p0028: 'faint', ctbto: 'faint', secoRange: ['2018-09-01T00:00:00-03:00', '2018-11-16T16:00:00-03:00', '2018-11-16T16:00:00-03:00'], secoHighlight: 'seco-133', clock: '2018-11-15T22:15:00-03:00' },
  },
  {
    id: 'hallazgo', chapter: '05 · Una coordenada', eyebrow: '17 nov. 2018',
    title: 'Después de 367 días',
    big: '907 m',
    body: [`A ${fmt0(DIST.wreck)} km de la última posición informada. A ${fmt0(DIST.wreckCtbto)} km de la estimación acústica.`],
    note: 'Hallazgo y profundidad: fuentes oficiales. Coordenada exacta: prensa.',
    certainty: 'hecho', sourceIds: ['mindef2018', 'armadaGacetilla1711', 'lanacion2018coordenada'],
    map: { bbox: SITE, p0028: 'crisp', ctbto: 'on', wreck: true, distances: true, clock: '2018-11-17T03:00:00-03:00', clockPrecision: 'dia' },
  },
];

export const SILENCE_START = '2017-11-15T07:19:00-03:00';
