import type { AppState, CrewFilters, ModuleId } from '../app/appStore';
import { TRAVESIA_RANGE, BUSQUEDA_RANGE } from '../app/appStore';
import { fromU, toU, T_0719 } from '../explore/travesia/travesiaModel';
import { T_HALLAZGO } from '../explore/busqueda/busquedaModel';
import { PROFILES } from '../explore/vidas/crewModel';
import { WRECK_DEPTH_M } from '../data/depth';
import { clamp, frac, smooth, track } from '../journey/track';

/**
 * GUION DEL TOUR DE 1 MINUTO (60,000 s exactos).
 *
 * Es sólo datos y funciones puras del tiempo transcurrido `e` (segundos desde que arrancó el tour):
 * no toca la interfaz. tour/runner.ts lo ejecuta y tour/director.ts lo conecta con la página. Así el
 * tour dura exacto aunque el equipo pierda cuadros, y `scripts/check-tour.mjs` puede comprobar la
 * duración, el orden de las acciones y que cada control que el cursor señala exista.
 *
 * Primera parte (0 a 34 s): lo mejor de la película del submarino, a velocidad real (1×) por segmentos,
 * con un fundido breve en cada salto. Segunda parte (34 a 60 s): un vistazo a Explorar.
 */
export const TOUR_SECONDS = 60;

/** Segmentos de película: el segundo `film` del relato se muestra a 1× durante `dur` s del tour. */
export interface FilmSegment {
  at: number;
  dur: number;
  film: number;
  note: string;
}

export const FILM_SEGMENTS: FilmSegment[] = [
  { at: 0.0, dur: 5.8, film: 0.0, note: 'Portada y las 44 luces sobre el mar' },
  { at: 5.8, dur: 7.4, film: 8.6, note: 'El submarino recorre el mapa: Mar del Plata → Ushuaia → patrulla' },
  { at: 13.2, dur: 3.6, film: 19.6, note: 'Última coordenada y su evidencia' },
  { at: 16.8, dur: 14.2, film: 40.8, note: 'Descenso con presión, silencio y colapso' },
  { at: 31.0, dur: 3.0, film: 57.0, note: 'Fondo a 907 m, 44 luces, hitos' },
];

/** Segundo del tour en el que se pasa de la película a Explorar. */
export const EXPLORE_AT = 34.0;

/** Explorar: un bloque por módulo (el último es la tarjeta final). */
export const EXPLORE_BLOCKS: { at: number; dur: number; module: ModuleId | null; note: string }[] = [
  { at: 34.0, dur: 6.2, module: 'vidas', note: 'Las 44 vidas: filtro por provincia y ficha' },
  { at: 40.2, dur: 6.2, module: 'travesia', note: 'La última travesía: línea de tiempo y submarino en 3D' },
  { at: 46.4, dur: 5.0, module: 'busqueda', note: 'La búsqueda: 367 días' },
  { at: 51.4, dur: 5.0, module: 'profundidad', note: '907 metros a escala real' },
  { at: 56.4, dur: 3.6, module: null, note: 'Tarjeta final' },
];

/** Instantes de los cortes (película o módulo): ahí hay un fundido breve. `half` es el medio ancho del fundido (s). */
export const CUTS: { at: number; half: number }[] = [
  ...FILM_SEGMENTS.slice(1).map((s) => ({ at: s.at, half: 0.18 })),
  { at: EXPLORE_AT, half: 0.32 },
  ...EXPLORE_BLOCKS.slice(1, 4).map((b) => ({ at: b.at, half: 0.2 })),
];

// ——— Subtítulos y capítulos ———

export interface Caption {
  from: number;
  to: number;
  text: string;
  chapter: string;
}

export const CAPTIONS: Caption[] = [
  { from: 0, to: 5.8, chapter: 'El relato', text: 'ARA San Juan · 44 personas · 15 de noviembre de 2017' },
  { from: 5.8, to: 10.8, chapter: 'El viaje', text: 'El viaje del submarino: Mar del Plata → Ushuaia → zona de patrulla' },
  { from: 10.8, to: 13.2, chapter: 'El viaje', text: 'Arrastrá sobre la escena para mirar alrededor' },
  { from: 13.2, to: 16.8, chapter: 'Las últimas horas', text: 'Última coordenada: cada dato abre su evidencia y su fuente' },
  { from: 16.8, to: 25.0, chapter: 'El descenso', text: 'Descenso ilustrativo: el clima cambia con la presión y la profundidad' },
  { from: 25.0, to: 31.0, chapter: 'El colapso', text: '10:51 · el colapso, como representación: no reproduce el hecho' },
  { from: 31.0, to: 34.0, chapter: '367 días', text: '367 días después · 907 m · 11 hitos y un enlace a cada instante' },
  { from: 34.0, to: 40.2, chapter: 'Explorar', text: 'Explorar · Las 44 vidas: filtrá y mapa, lista y gráficos cambian juntos' },
  { from: 40.2, to: 46.4, chapter: 'Explorar', text: 'La última travesía: línea de tiempo, capas y el submarino en 3D' },
  { from: 46.4, to: 51.4, chapter: 'Explorar', text: 'La búsqueda: 367 días de rastreo con las posiciones publicadas' },
  { from: 51.4, to: 56.4, chapter: 'Explorar', text: '907 metros a escala real, con referencias de altura' },
  { from: 56.4, to: TOUR_SECONDS + 1, chapter: 'Fin', text: 'Explorá, mirá la película o compartí un instante' },
];

// ——— Funciones puras del tiempo ———

export function segmentAt(e: number): FilmSegment | null {
  if (e >= EXPLORE_AT) return null;
  for (let i = FILM_SEGMENTS.length - 1; i >= 0; i--) if (e >= FILM_SEGMENTS[i].at) return FILM_SEGMENTS[i];
  return FILM_SEGMENTS[0];
}

/** Segundo del relato a mostrar (1× dentro de cada segmento). */
export function filmTimeAt(e: number): number {
  const s = segmentAt(Math.min(e, EXPLORE_AT - 1e-6)) ?? FILM_SEGMENTS[FILM_SEGMENTS.length - 1];
  return s.film + clamp(e - s.at, 0, s.dur);
}

/** Opacidad de la cortina de fundido (0 a 1): un pulso triangular alrededor de cada corte. */
export function fadeAt(e: number): number {
  let f = 0;
  for (const c of CUTS) f = Math.max(f, 1 - Math.abs(e - c.at) / c.half);
  return clamp(f);
}

export function captionAt(e: number): Caption {
  return CAPTIONS.find((c) => e >= c.from && e < c.to) ?? CAPTIONS[CAPTIONS.length - 1];
}

export function blockAt(e: number) {
  return EXPLORE_BLOCKS.find((b) => e >= b.at && e < b.at + b.dur) ?? null;
}

// ——— Acciones únicas (cuando el tiempo las cruza, en orden) ———

/** Posición del cursor: sobre un control real (`target`, con fracciones del rectángulo) o en la pantalla (x, y en 0–1). */
export interface CursorGoal {
  target?: string;
  fx?: number;
  fy?: number;
  x?: number;
  y?: number;
}

export type Cue =
  | { at: number; kind: 'cursor'; goal: CursorGoal | null }
  | { at: number; kind: 'click' }
  | { at: number; kind: 'ring'; target: string | null }
  | { at: number; kind: 'module'; module: ModuleId }
  | { at: number; kind: 'filters'; patch: Partial<CrewFilters> }
  | { at: number; kind: 'app'; patch: Partial<AppState> }
  | { at: number; kind: 'evidence'; id: string | null };

/** Rostro de una persona nacida en Jujuy (con retrato) para mostrar su ficha. */
const jujuy = PROFILES.find((p) => p.nacimiento.provincia === 'Jujuy' && p.retrato) ?? PROFILES[0];

const RAW_CUES: Cue[] = [
  // Película: mirada libre (se ve el cursor «arrastrando»), evidencia de la última coordenada, hitos y enlace.
  { at: 10.7, kind: 'cursor', goal: { x: 0.52, y: 0.56 } },
  { at: 13.3, kind: 'cursor', goal: null },
  { at: 14.2, kind: 'evidence', id: 'c0028' },
  { at: 16.2, kind: 'evidence', id: null },
  { at: 31.4, kind: 'ring', target: 'jt' },
  { at: 31.4, kind: 'cursor', goal: { target: 'jt', fx: 0.62, fy: 0.5 } },
  { at: 32.7, kind: 'ring', target: 'share' },
  { at: 32.7, kind: 'cursor', goal: { target: 'share', fx: 0.5, fy: 0.5 } },
  { at: 33.4, kind: 'click' },

  // Explorar · Las 44 vidas
  { at: 34.0, kind: 'module', module: 'vidas' },
  { at: 34.0, kind: 'ring', target: null },
  { at: 34.0, kind: 'cursor', goal: null },
  { at: 34.6, kind: 'cursor', goal: { target: 'prov-Jujuy', fx: 0.5, fy: 0.5 } },
  { at: 35.5, kind: 'click' },
  { at: 35.5, kind: 'filters', patch: { provincias: ['Jujuy'] } },
  { at: 35.5, kind: 'app', patch: { focusProvince: 'Jujuy', selectedPlace: null } },
  { at: 37.3, kind: 'cursor', goal: { target: `face-${jujuy.orden}`, fx: 0.5, fy: 0.5 } },
  { at: 38.2, kind: 'click' },
  { at: 38.2, kind: 'app', patch: { selectedCrew: jujuy.orden, selectedPlace: jujuy.nacimiento.georefId } },

  // Explorar · La última travesía
  { at: 39.5, kind: 'cursor', goal: { target: 'nav-travesia', fx: 0.5, fy: 0.5 } },
  { at: 40.2, kind: 'click' },
  { at: 40.2, kind: 'module', module: 'travesia' },
  { at: 44.8, kind: 'cursor', goal: { target: 'sub3d', fx: 0.5, fy: 0.5 } },
  { at: 45.4, kind: 'click' },
  { at: 45.4, kind: 'app', patch: { subInspect: true, selectedPart: 'vela' } },

  // Explorar · La búsqueda
  { at: 45.9, kind: 'cursor', goal: { target: 'nav-busqueda', fx: 0.5, fy: 0.5 } },
  { at: 46.4, kind: 'click' },
  { at: 46.4, kind: 'module', module: 'busqueda' },

  // Explorar · 907 metros
  { at: 50.9, kind: 'cursor', goal: { target: 'nav-profundidad', fx: 0.5, fy: 0.5 } },
  { at: 51.4, kind: 'click' },
  { at: 51.4, kind: 'module', module: 'profundidad' },

  // Fin
  { at: 56.4, kind: 'cursor', goal: null },
];

/** Las acciones, ordenadas por instante (el orden de escritura se conserva cuando coinciden). */
export const CUES: Cue[] = RAW_CUES.map((c, i) => ({ c, i })).sort((a, b) => a.c.at - b.c.at || a.i - b.i).map((x) => x.c);

// ——— Animaciones continuas (valores por cuadro) ———

export interface Look {
  dAz: number;
  dEl: number;
  zoom: number;
}

export interface TrackValues {
  look?: Look;
  travesiaT?: number;
  busquedaT?: number;
  depth?: number;
  /** El cursor «arrastra» un control: sustituye a la última acción de cursor mientras dura. */
  cursor?: CursorGoal & { down: boolean };
}

/** Mirada libre del tramo del viaje: el cursor «arrastra» y la cámara orbita. */
const lookAz = track([[10.8, 0], [11.7, 34], [12.5, -16], [13.2, 0]]);
const lookEl = track([[10.8, 0], [11.7, -9], [12.5, 9], [13.2, 0]]);
const lookX = track([[10.8, 0.52], [11.7, 0.62], [12.5, 0.45], [13.2, 0.52]]);

/** Travesía: la línea de tiempo se arrastra del zarpe a las 07:19 (en la escala por tramos de la línea). */
const U_0719 = toU(T_0719);
/** Búsqueda: 15/11/2017 → hallazgo. */
const BUSQ_FROM = BUSQUEDA_RANGE[0];
/** Profundidad: pasa por las referencias (Obelisco, Eiffel, Burj Khalifa) y llega a 907 m. */
const depthTrack = track([[52.0, 0], [52.7, 80], [53.1, 150], [53.4, 340], [53.9, 440], [54.3, 820], [54.9, 862], [55.5, WRECK_DEPTH_M]]);

export function trackValuesAt(e: number): TrackValues {
  const v: TrackValues = {};
  if (e >= 10.8 && e < 13.2) {
    v.look = { dAz: lookAz(e), dEl: lookEl(e), zoom: 1 };
    v.cursor = { x: lookX(e), y: 0.56, down: true };
  }
  // Cada valor se mantiene en su punto final mientras su módulo sigue a la vista (para que un salto de cuadros no lo deje a medias).
  if (e >= 41.0 && e < 46.4) {
    const k = smooth(frac(e, 41.0, 44.5));
    v.travesiaT = fromU(U_0719 * k);
    if (e < 44.6) v.cursor = { target: 'trav-track', fx: Math.min(0.98, U_0719 * k + 0.01), fy: 0.5, down: true };
  }
  if (e >= 47.2 && e < 51.4) {
    const k = smooth(frac(e, 47.3, 50.4));
    v.busquedaT = BUSQ_FROM + (T_HALLAZGO - BUSQ_FROM) * k;
    if (e < 50.5) v.cursor = { target: 'busq-track', fx: Math.min(0.98, k * ((T_HALLAZGO - BUSQ_FROM) / (BUSQUEDA_RANGE[1] - BUSQ_FROM)) + 0.01), fy: 0.5, down: true };
  }
  if (e >= 52.0) {
    const d = depthTrack(e);
    v.depth = d;
    if (e < 55.6) v.cursor = { target: 'depth-track', fx: 0.5, fy: Math.min(0.98, d / WRECK_DEPTH_M + 0.01), down: true };
  }
  return v;
}

/** Valores iniciales de los módulos de Explorar al empezar cada bloque (para que el tour sea repetible). */
export const EXPLORE_START: Partial<AppState> = {
  travesiaT: TRAVESIA_RANGE[0],
  travesiaPlaying: false,
  busquedaT: BUSQ_FROM,
  busquedaPlaying: false,
  depth: 0,
};

/** Todos los `data-tour` que el guion señala (los verifica scripts/check-tour.mjs). */
export function tourTargets(): string[] {
  const out = new Set<string>();
  for (const c of CUES) {
    if (c.kind === 'cursor' && c.goal?.target) out.add(c.goal.target);
    if (c.kind === 'ring' && c.target) out.add(c.target);
  }
  for (const t of ['trav-track', 'busq-track', 'depth-track']) out.add(t);
  return [...out];
}

export const JUJUY_ORDEN = jujuy.orden;
