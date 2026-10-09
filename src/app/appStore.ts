import { useSyncExternalStore } from 'react';

/**
 * ESTADO COMPARTIDO DE LA EXPLORACIÓN.
 *
 * Mapa 3D, listas, gráficos, contadores y paneles leen de este único estado: si se filtra por
 * provincia, cambian a la vez los marcadores, la lista, el contador y los gráficos.
 * La historia guiada tiene su propio controlador (story/store.ts); ambos modos comparten datos
 * y componentes 3D.
 */
export type Mode = 'story' | 'explore';
export type ModuleId = 'vidas' | 'travesia' | 'busqueda' | 'profundidad';

export const MODULES: { id: ModuleId; num: string; label: string; short: string }[] = [
  { id: 'vidas', num: '1', label: 'Las 44 vidas', short: '44 vidas' },
  { id: 'travesia', num: '2', label: 'La última travesía', short: 'Travesía' },
  { id: 'busqueda', num: '3', label: 'La búsqueda', short: 'Búsqueda' },
  { id: 'profundidad', num: '4', label: '907 metros', short: '907 m' },
];

export type Sexo = 'todos' | 'mujer' | 'varón';

/** Módulo 1: los resultados se pueden ver como mosaico de retratos o como lista con datos. */
export type VidasView = 'mosaico' | 'lista';

export interface CrewFilters {
  provincias: string[];
  edad: [number, number];
  sexo: Sexo;
  grados: string[];
  localidad: string;
  nombre: string;
}

export const EDAD_RANGO: [number, number] = [25, 47];

export const DEFAULT_FILTERS: CrewFilters = {
  provincias: [],
  edad: [...EDAD_RANGO],
  sexo: 'todos',
  grados: [],
  localidad: '',
  nombre: '',
};

export type TravesiaLayer =
  | 'trazado'
  | 'posiciones'
  | 'comunicaciones'
  | 'tecnicos'
  | 'hipotesis'
  | 'acustico'
  | 'batimetria'
  | 'hallazgo';

export const TRAVESIA_LAYERS: { id: TravesiaLayer; label: string; note: string }[] = [
  { id: 'trazado', label: 'Trazado esquemático', note: 'Une lugares documentados; no es el recorrido real.' },
  { id: 'posiciones', label: 'Posiciones documentadas', note: 'Puertos y la coordenada de las 00:28.' },
  { id: 'comunicaciones', label: 'Comunicaciones', note: 'Llamadas y mensajes del 14 y 15/11.' },
  { id: 'tecnicos', label: 'Acontecimientos técnicos', note: 'Incendio en baterías e ingreso de agua.' },
  { id: 'hipotesis', label: 'Hipótesis de alcance', note: 'Área alcanzable a 5 nudos (no es una posición).' },
  { id: 'acustico', label: 'Evento acústico (CTBTO)', note: 'Ubicación estimada por triangulación.' },
  { id: 'batimetria', label: 'Batimetría', note: 'Color del fondo marino según profundidad (GEBCO 2020).' },
  { id: 'hallazgo', label: 'Hallazgo', note: 'Restos a 907 m (17/11/2018) y distancias.' },
];

export interface AppState {
  mode: Mode;
  module: ModuleId;
  panelOpen: boolean;
  methodologyOpen: boolean;
  /** Pedido de «restablecer vista»: la cámara de cada módulo lo observa. */
  viewResetKey: number;

  // Módulo 1
  filters: CrewFilters;
  vidasView: VidasView;
  selectedCrew: number | null;
  /** Lugar de nacimiento seleccionado en el mapa (identificador Georef). */
  selectedPlace: string | null;
  focusProvince: string | null;

  // Módulo 2
  travesiaT: number;
  travesiaPlaying: boolean;
  travesiaSpeed: 0.5 | 1 | 2;
  layers: Record<TravesiaLayer, boolean>;
  selectedEventId: string | null;
  subInspect: boolean;
  selectedPart: string | null;

  // Módulo 3
  busquedaT: number;
  busquedaPlaying: boolean;
  busquedaFase: 'todas' | '2017' | '2018';
  compare: { a: [number, number]; b: [number, number] } | null;

  // Módulo 4
  depth: number;
  physicsOpen: boolean;
  pinComparison: boolean;

  // Evidencia
  evidenceEventId: string | null;
}

/** Inicio y fin de la línea de tiempo de la travesía (hora oficial argentina). */
export const TRAVESIA_RANGE: [number, number] = [Date.parse('2017-10-25T00:00:00-03:00'), Date.parse('2017-11-15T11:30:00-03:00')];
/** Inicio y fin de la línea de tiempo de la búsqueda. */
export const BUSQUEDA_RANGE: [number, number] = [Date.parse('2017-11-15T07:19:00-03:00'), Date.parse('2018-11-30T00:00:00-03:00')];

const ALL_LAYERS = Object.fromEntries(TRAVESIA_LAYERS.map((l) => [l.id, true])) as Record<TravesiaLayer, boolean>;

let state: AppState = {
  mode: 'story',
  module: 'vidas',
  panelOpen: true,
  methodologyOpen: false,
  viewResetKey: 0,
  filters: DEFAULT_FILTERS,
  vidasView: 'mosaico',
  selectedCrew: null,
  selectedPlace: null,
  focusProvince: null,
  travesiaT: TRAVESIA_RANGE[0],
  travesiaPlaying: false,
  travesiaSpeed: 1,
  layers: ALL_LAYERS,
  selectedEventId: null,
  subInspect: false,
  selectedPart: null,
  busquedaT: Date.parse('2018-11-17T03:00:00-03:00'),
  busquedaPlaying: false,
  busquedaFase: 'todas',
  compare: null,
  depth: 0,
  physicsOpen: true,
  pinComparison: false,
  evidenceEventId: null,
};

const listeners = new Set<() => void>();

export const appStore = {
  get: () => state,
  set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
    const p = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...p };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export const setApp = appStore.set;

/** Lee una porción del estado. El selector debe devolver un valor estable (primitivo u objeto del estado). */
export function useApp<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(appStore.subscribe, () => sel(state), () => sel(state));
}

export function setFilters(patch: Partial<CrewFilters>) {
  setApp((s) => ({ filters: { ...s.filters, ...patch } }));
}

export function resetFilters() {
  setApp({ filters: DEFAULT_FILTERS, focusProvince: null, selectedPlace: null });
}

export function openModule(m: ModuleId) {
  setApp({ mode: 'explore', module: m, evidenceEventId: null, subInspect: false, travesiaPlaying: false, busquedaPlaying: false });
}

export function resetView() {
  setApp((s) => ({ viewResetKey: s.viewResetKey + 1, focusProvince: null }));
}
