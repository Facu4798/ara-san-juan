import { events } from '../../data/events';
import type { Certainty, TimelineEvent } from '../../data/types';
import { POS_0028, HYPOTHESIS_SPEED } from '../../data/positions';
import { TRAVESIA_RANGE, type TravesiaLayer } from '../../app/appStore';

/**
 * MODELO TEMPORAL DE LA ÚLTIMA TRAVESÍA.
 *
 * Escala de tiempo POR TRAMOS (se declara en la interfaz): las tres semanas de misión ocupan
 * el 30 % de la línea y las últimas 13,5 horas —donde ocurre casi todo lo documentado— el 70 %.
 *
 * Certeza de la posición del submarino en cada instante:
 *   hecho       en Mar del Plata (25/10), en Ushuaia (4 al 8/11) y a las 00:28 del 15/11;
 *   hipotesis   entre esos lugares: trazado esquemático, no el recorrido real;
 *   desconocido después de las 00:28: ninguna posición publicada.
 */
const T = (iso: string) => Date.parse(iso);

export const BREAKS = [TRAVESIA_RANGE[0], T('2017-11-14T22:00:00-03:00'), TRAVESIA_RANGE[1]];
const FRACTIONS = [0, 0.3, 1];

/** Instante → fracción de la línea de tiempo (0 a 1). */
export function toU(t: number): number {
  if (t <= BREAKS[0]) return 0;
  for (let i = 1; i < BREAKS.length; i++) {
    if (t <= BREAKS[i]) return FRACTIONS[i - 1] + ((t - BREAKS[i - 1]) / (BREAKS[i] - BREAKS[i - 1])) * (FRACTIONS[i] - FRACTIONS[i - 1]);
  }
  return 1;
}

/** Fracción de la línea de tiempo → instante. */
export function fromU(u: number): number {
  const v = Math.min(1, Math.max(0, u));
  for (let i = 1; i < FRACTIONS.length; i++) {
    if (v <= FRACTIONS[i]) return BREAKS[i - 1] + ((v - FRACTIONS[i - 1]) / (FRACTIONS[i] - FRACTIONS[i - 1])) * (BREAKS[i] - BREAKS[i - 1]);
  }
  return BREAKS[BREAKS.length - 1];
}

export const T_ZARPE = T('2017-10-25T12:00:00-03:00');
export const T_USHUAIA_IN = T('2017-11-04T12:00:00-03:00');
export const T_USHUAIA_OUT = T('2017-11-08T12:00:00-03:00');
export const T_0028 = T(POS_0028.datetime!);
export const T_0719 = T('2017-11-15T07:19:00-03:00');
export const T_1051 = T('2017-11-15T10:51:00-03:00');

/** Acontecimientos de la travesía (con fuente), en orden. */
export const TRAVESIA_EVENTS: TimelineEvent[] = events
  .filter((e) => ['mision', 'ultimas-horas', 'silencio'].includes(e.phase) && Date.parse(e.datetime) <= TRAVESIA_RANGE[1])
  .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));

/** Capas a las que pertenece cada acontecimiento (para filtrar la línea de tiempo y el mapa). */
export function eventLayers(e: TimelineEvent): TravesiaLayer[] {
  const out: TravesiaLayer[] = [];
  if (e.positionId) out.push('posiciones');
  if (e.phase !== 'mision' && e.id !== 'ctbto') out.push('comunicaciones');
  if (e.id === 'c2342' || e.id === 'c0600') out.push('tecnicos');
  if (e.id === 'ctbto') out.push('acustico');
  if (!out.length) out.push('posiciones');
  return out;
}

export type SubLeg = 'mdp' | 'ida' | 'ushuaia' | 'vuelta' | 'en-0028' | 'desconocida';

/** Dónde está (o no) el submarino en el instante t, y con qué certeza. */
export function subAt(t: number): { leg: SubLeg; f: number; certainty: Certainty; texto: string } {
  if (t <= T_ZARPE) return { leg: 'mdp', f: 0, certainty: 'hecho', texto: 'En Mar del Plata, su base' };
  if (t < T_USHUAIA_IN) return { leg: 'ida', f: (t - T_ZARPE) / (T_USHUAIA_IN - T_ZARPE), certainty: 'hipotesis', texto: 'Navegando hacia Ushuaia · trazado esquemático' };
  if (t <= T_USHUAIA_OUT) return { leg: 'ushuaia', f: 1, certainty: 'hecho', texto: 'Escala en Ushuaia (4 al 8/11)' };
  if (t < T_0028) return { leg: 'vuelta', f: (t - T_USHUAIA_OUT) / (T_0028 - T_USHUAIA_OUT), certainty: 'hipotesis', texto: 'En el área de patrulla · trazado esquemático' };
  if (t < T_0028 + 15 * 60_000) return { leg: 'en-0028', f: 1, certainty: 'hecho', texto: 'Posición GPS informada a las 00:28' };
  return { leg: 'desconocida', f: 1, certainty: 'desconocido', texto: 'Posición no publicada desde las 00:28' };
}

/** Horas transcurridas desde la última coordenada y radio de la hipótesis de alcance (km). */
export function hypothesisAt(t: number) {
  if (t <= T_0028) return null;
  const hours = (Math.min(t, T_1051) - T_0028) / 3.6e6;
  return { hours, km: hours * HYPOTHESIS_SPEED.kmPorHora };
}

/** Acontecimiento más reciente a la hora t (o null). */
export function currentEvent(t: number, list = TRAVESIA_EVENTS) {
  let last: TimelineEvent | null = null;
  for (const e of list) if (Date.parse(e.datetime) <= t) last = e;
  return last;
}

/** Duración de la reproducción a 1× (segundos) para recorrer toda la línea. */
export const PLAY_SECONDS = 48;
