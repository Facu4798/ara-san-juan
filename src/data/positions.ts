import type { Position } from './types';
import secoRaw from './generated/seabedConstructorPositions.json';
import { dms } from '../utils/geo';

/**
 * Posiciones geográficas.
 *
 * Regla: sólo se dibuja lo publicado. No existe trayectoria documentada del submarino
 * entre Ushuaia y el 15/11/2017, ni posición publicada para la última comunicación (07:19).
 */

/** Ciudades: coordenadas de referencia del casco urbano (no son posiciones del submarino). */
const CITY = ['wikipediaCoords'];
export const referencePlaces: Position[] = [
  { id: 'buenos-aires', label: 'Buenos Aires', lat: -34.5997, lon: -58.3819, kind: 'referencia', certainty: 'hecho', sourceIds: CITY, nota: 'Referencia geográfica.' },
  { id: 'mar-del-plata', label: 'Mar del Plata', lat: -38, lon: -57.55, kind: 'referencia', certainty: 'hecho', sourceIds: CITY, nota: 'Base del submarino. Zarpó el 25/10/2017.' },
  { id: 'comodoro', label: 'Comodoro Rivadavia', lat: -45.8667, lon: -67.5, kind: 'referencia', certainty: 'hecho', sourceIds: CITY, nota: 'Puerto base de la búsqueda de 2018.' },
  { id: 'caleta-olivia', label: 'Caleta Olivia', lat: -46.4333, lon: -67.5333, kind: 'referencia', certainty: 'hecho', sourceIds: CITY, nota: 'Referencia geográfica.' },
  { id: 'puerto-deseado', label: 'Puerto Deseado', lat: -47.75, lon: -65.9167, kind: 'referencia', certainty: 'hecho', sourceIds: CITY, nota: 'Referencia geográfica.' },
  { id: 'ushuaia', label: 'Ushuaia', lat: -54.8072, lon: -68.3081, kind: 'referencia', certainty: 'hecho', sourceIds: CITY, nota: 'Escala del 4 al 8/11/2017.' },
];

export const POS_0028: Position = {
  id: 'pos-0028',
  label: 'Última posición informada',
  lat: dms(46, 44),
  lon: dms(60, 8),
  datetime: '2017-11-15T00:28:00-03:00',
  kind: 'submarino',
  certainty: 'hecho',
  textoFuente: '46° 44′ S, 60° 08′ O',
  sourceIds: ['infobae2026requerimiento'],
  nota: 'Posición GPS comunicada por teléfono satelital. Precisión textual: 1′ (~1,8 km). Siete horas antes de la última comunicación.',
};

export const POS_CTBTO: Position = {
  id: 'ctbto',
  label: 'Evento hidroacústico (estimación)',
  lat: -46.12,
  lon: -59.69,
  datetime: '2017-11-15T10:51:00-03:00',
  kind: 'anomalia',
  certainty: 'estimacion',
  textoFuente: 'Event Latitude: -46.12 deg; Event Longitude: -59.69 deg',
  sourceIds: ['ctbto2017'],
  nota: 'Localización por triangulación desde estaciones a miles de km. No es una observación del submarino. El comunicado no publica margen de error.',
};

export const POS_HALLAZGO: Position = {
  id: 'hallazgo',
  label: 'Hallazgo — POI N.º 24',
  lat: dms(45, 56, 59),
  lon: dms(59, 46, 22),
  datetime: '2018-11-17T03:00:00-03:00',
  kind: 'hallazgo',
  certainty: 'hecho',
  textoFuente: '45°56′59″ S, 59°46′22″ O',
  sourceIds: ['lanacion2018coordenada', 'mindef2018', 'armadaGacetilla1711'],
  nota: 'El hallazgo es un hecho oficial; la coordenada exacta proviene de prensa (no se halló publicación oficial). Consistente con GEBCO (−910 m) y con la distancia a la estimación CTBTO.',
};

/** Elipses de error publicadas para la localización del evento (sin centro ni orientación publicados). */
export const CTBTO_ERROR_ELLIPSES = [
  { ejeMayorKm: 19, ejeMenorKm: 12, base: 'dos detecciones hidroacústicas y una sísmica', sourceId: 'dallosto2019' },
  { ejeMayorKm: 500, ejeMenorKm: 25, base: 'sólo el arribo principal en dos estaciones hidroacústicas', sourceId: 'dallosto2019' },
] as const;

export const keyPositions: Position[] = [POS_0028, POS_CTBTO, POS_HALLAZGO];

interface SecoRaw {
  parte: number;
  fechaHoraLocal: string;
  lat: number;
  lon: number;
  psnTexto: string;
  areasMencionadas: string[];
}

/** Posición del Seabed Constructor según los partes oficiales (06:00 y 16:00). */
export const searchVesselPositions: Position[] = (secoRaw as SecoRaw[]).map((r) => ({
  id: `seco-${r.parte}`,
  label: `Seabed Constructor — Parte N.º ${r.parte}`,
  lat: r.lat,
  lon: r.lon,
  datetime: r.fechaHoraLocal,
  kind: 'buque-busqueda',
  certainty: 'hecho',
  textoFuente: r.psnTexto,
  sourceIds: ['armadaPartes2018'],
  nota: r.areasMencionadas.length ? `Áreas mencionadas en el parte: ${r.areasMencionadas.join(', ')}` : undefined,
}));

export const allPositions: Position[] = [...referencePlaces, ...keyPositions, ...searchVesselPositions];
export const positionById = new Map(allPositions.map((p) => [p.id, p]));

/**
 * HIPÓTESIS DIDÁCTICA (no es un dato): área alcanzable si el submarino hubiera navegado
 * a 5 nudos —la velocidad informada a las 23:42— en cualquier dirección desde la
 * última posición. Sirve para mostrar cómo crece la incertidumbre con el tiempo,
 * no para estimar dónde estaba.
 */
export const HYPOTHESIS_SPEED = {
  nudos: 5,
  kmPorHora: 5 * 1.852,
  sourceIds: ['infobae2026requerimiento'],
};

/**
 * Punto de la costa más cercano a la coordenada de las 00:28, calculado sobre la costa de
 * Natural Earth 1:50m (haversine). Cálculo propio: lo recalcula y verifica scripts/verify-data.mjs.
 */
export const COAST_NEAREST_0028 = { lat: -47.345, lon: -65.738, km: 430, provincia: 'Santa Cruz' };
