import { events } from '../../data/events';
import { searchVesselPositions } from '../../data/positions';
import { searchFacts2017, searchFacts2018 } from '../../data/search';
import type { TimelineEvent } from '../../data/types';

/**
 * MODELO DE LA BÚSQUEDA (15/11/2017 → 17/11/2018).
 *
 * Datos espaciales disponibles: sólo las posiciones diarias del buque Seabed Constructor
 * que figuran en los partes oficiales recuperados (19 con coordenada, sept.–nov. 2018).
 * La Armada no publicó zonas, polígonos ni recorridos de la búsqueda de 2017: no se dibujan.
 * Las métricas se muestran con su definición, su fuente y desde cuándo valen.
 */
const T = (iso: string) => Date.parse(iso);

export const T_ULTIMA_COM = T('2017-11-15T07:19:00-03:00');
export const T_INICIO_2018 = T('2018-09-07T12:00:00-03:00');
export const T_HALLAZGO = T('2018-11-17T03:00:00-03:00');
export const T_POI24 = T('2018-11-15T22:15:00-03:00');

export type Fase = '2017' | '2018';

export const SEARCH_EVENTS: (TimelineEvent & { fase: Fase })[] = events
  .filter((e) => ['busqueda-2017', 'busqueda-2018', 'hallazgo'].includes(e.phase) && e.id !== 'imagenes')
  .map((e) => ({ ...e, fase: (Date.parse(e.datetime) >= T('2018-07-01T00:00:00-03:00') ? '2018' : '2017') as Fase }))
  .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));

export const VESSEL = searchVesselPositions.map((p) => ({ ...p, t: Date.parse(p.datetime!) }));

/** Días calendario (en hora argentina) desde el 15/11/2017: el 17/11/2018 da 367, como en el resto del proyecto. */
const dayNumber = (t: number) => Math.floor((t - 3 * 3_600_000) / 86_400_000);
export const daysSince = (t: number) => Math.max(0, dayNumber(t) - dayNumber(T_ULTIMA_COM));

export interface Metric {
  id: string;
  valor: string;
  label: string;
  definicion: string;
  desde: number;
  sourceIds: string[];
  fase: Fase | 'ambas';
}

const fact = (id: string) => [...searchFacts2017, ...searchFacts2018].find((f) => f.id === id)!;
const fmt = (n: number) => new Intl.NumberFormat('es-AR').format(n);

/** Métricas con definición y fuente. Las calculadas dicen cómo se calculan. */
export function metricsAt(t: number): Metric[] {
  const partes = VESSEL.filter((v) => v.t <= t).length;
  const list: Metric[] = [
    { id: 'dias', valor: fmt(daysSince(Math.min(t, T_HALLAZGO))), label: t >= T_HALLAZGO ? 'días hasta el hallazgo' : 'días desde la última comunicación', definicion: 'Días calendario transcurridos desde el 15/11/2017, día de la última comunicación (07:19), hasta la fecha elegida. Cálculo propio.', desde: T_ULTIMA_COM, sourceIds: ['infobae2026requerimiento'], fase: 'ambas' },
    { id: 'paises', valor: fmt(fact('paises').valor), label: 'países participaron', definicion: 'Cifra agregada de la búsqueda iniciada el 15/11/2017. Sin desagregación por fecha ni por país.', desde: T('2017-11-15T12:00:00-03:00'), sourceIds: fact('paises').sourceIds, fase: '2017' },
    { id: 'personas', valor: `+${fmt(fact('personas').valor)}`, label: 'personas', definicion: '«Más de 4000 hombres»: cifra agregada, sin desagregación temporal.', desde: T('2017-11-15T12:00:00-03:00'), sourceIds: fact('personas').sourceIds, fase: '2017' },
    { id: 'buques', valor: fmt(fact('buques').valor), label: 'unidades de superficie', definicion: 'Cifra agregada de buques que participaron. No se publicaron sus recorridos.', desde: T('2017-11-15T12:00:00-03:00'), sourceIds: fact('buques').sourceIds, fase: '2017' },
    { id: 'aeronaves', valor: fmt(fact('aeronaves').valor), label: 'aeronaves', definicion: 'Cifra agregada. No se publicaron sus recorridos.', desde: T('2017-11-15T12:00:00-03:00'), sourceIds: fact('aeronaves').sourceIds, fase: '2017' },
    { id: 'contactos', valor: fmt(fact('contactos').valor), label: 'contactos investigados', definicion: 'En «los primeros 120 días de búsqueda». Ninguno era el submarino.', desde: T('2018-03-15T12:00:00-03:00'), sourceIds: fact('contactos').sourceIds, fase: '2017' },
    { id: 'pendientes', valor: fmt(fact('pendientes').valor), label: 'puntos pendientes entregados a Ocean Infinity', definicion: 'Contactos por investigar transferidos el 22/08/2018.', desde: T('2018-08-22T12:00:00-03:00'), sourceIds: fact('pendientes').sourceIds, fase: '2018' },
    { id: 'auv', valor: fmt(fact('auv').valor), label: 'vehículos autónomos (AUV)', definicion: 'Vehículos submarinos autónomos del Seabed Constructor que relevaron el fondo con sonar.', desde: T_INICIO_2018, sourceIds: fact('auv').sourceIds, fase: '2018' },
    { id: 'partes', valor: fmt(partes), label: 'posiciones del buque con coordenada', definicion: 'Partes oficiales recuperados que traen la posición del Seabed Constructor hasta la fecha elegida (19 en total). Es la posición del buque, no la cobertura del fondo.', desde: T_INICIO_2018, sourceIds: ['armadaPartes2018'], fase: '2018' },
    { id: 'poi', valor: '24', label: 'N.º del punto de interés que resultó ser el submarino', definicion: 'Informado por la empresa a las 22:15 del 15/11/2018; identificado con ROV el 17/11/2018.', desde: T_POI24, sourceIds: fact('poi').sourceIds, fase: '2018' },
  ];
  return list.filter((m) => m.desde <= t);
}

/** Períodos rápidos para comparar. */
export const PERIODS: { id: string; label: string; range: [number, number] }[] = [
  { id: 'nov17', label: 'Nov. 2017', range: [T('2017-11-15T00:00:00-03:00'), T('2017-12-01T00:00:00-03:00')] },
  { id: 'mar18', label: 'Dic. 2017 – mar. 2018', range: [T('2017-12-01T00:00:00-03:00'), T('2018-04-01T00:00:00-03:00')] },
  { id: 'sep18', label: 'Sept. 2018', range: [T('2018-09-01T00:00:00-03:00'), T('2018-10-01T00:00:00-03:00')] },
  { id: 'oct18', label: 'Oct. 2018', range: [T('2018-10-01T00:00:00-03:00'), T('2018-11-01T00:00:00-03:00')] },
  { id: 'nov18', label: 'Nov. 2018', range: [T('2018-11-01T00:00:00-03:00'), T('2018-11-30T00:00:00-03:00')] },
];

/** Resumen documentado de un período: sólo conteos que los datos permiten. */
export function periodSummary(range: [number, number]) {
  const [a, b] = range;
  return {
    eventos: SEARCH_EVENTS.filter((e) => Date.parse(e.datetime) >= a && Date.parse(e.datetime) < b),
    posiciones: VESSEL.filter((v) => v.t >= a && v.t < b),
    diasDesde: daysSince(a),
  };
}
