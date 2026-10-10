import { useSyncExternalStore } from 'react';
import { appStore, openModule, setApp, setFilters, DEFAULT_FILTERS, type AppState } from '../app/appStore';
import { play, seekNow, setStoryLocked, stop as stopStory, storyStore } from '../story/store';
import { live } from '../journey/live';
import { resetLook } from '../journey/freeLook';
import { start as startAudio } from '../audio/engine';
import { TourRunner, type Hooks } from './runner';
import { EXPLORE_START, TOUR_SECONDS, type Cue, type CursorGoal } from './script';
import { decodeVoice, preloadVoiceFiles, speak, stopSpeaking } from './voice';

/**
 * DIRECTOR DEL TOUR. Conecta el guion (tour/script.ts, puro) con la página: mueve el tiempo de la
 * película, cambia de módulo, aplica filtros y mueve el cursor fantasma. Corre con un reloj propio
 * (performance.now): en cada cuadro calcula cuánto pasó desde el inicio y deja que el ejecutor
 * (tour/runner.ts) ponga todo al día. Así el tour dura 60,0 s aunque se pierdan cuadros.
 *
 * Mientras corre, el relato está bloqueado (setStoryLocked): ni el scroll, ni el teclado, ni los
 * gestos lo mueven. Al salir se restaura el estado en el que estaba la página.
 */
export type TourPhase = 'idle' | 'gate' | 'running' | 'ended';

export interface TourState {
  phase: TourPhase;
  /** Segundos transcurridos (0 a 60). */
  e: number;
  caption: string;
  chapter: string;
  /** Opacidad de la cortina de fundido (0 a 1). */
  fade: number;
  /** Última acción de cursor del guion. */
  cursor: CursorGoal | null;
  /** Cursor «arrastrando» un control (animación continua). */
  drag: (CursorGoal & { down: boolean }) | null;
  /** Control resaltado con un aro. */
  ring: string | null;
  /** Se incrementa en cada clic del cursor (para dibujar la onda). */
  pulse: number;
}

const INITIAL: TourState = { phase: 'idle', e: 0, caption: '', chapter: '', fade: 0, cursor: null, drag: null, ring: null, pulse: 0 };
let state: TourState = INITIAL;
const listeners = new Set<() => void>();
const emit = (patch: Partial<TourState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const tourStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  get: () => state,
};

export function useTour<T>(sel: (s: TourState) => T): T {
  return useSyncExternalStore(tourStore.subscribe, () => sel(state), () => sel(state));
}

/** Estado de Explorar limpio: sin filtros, fichas ni paneles abiertos. */
const CLEAN: Partial<AppState> = {
  filters: DEFAULT_FILTERS,
  selectedCrew: null,
  selectedPlace: null,
  focusProvince: null,
  selectedEventId: null,
  selectedPart: null,
  subInspect: false,
  evidenceEventId: null,
  methodologyOpen: false,
  pinComparison: false,
  compare: null,
  ...EXPLORE_START,
};

let runner: TourRunner | null = null;
let raf = 0;
let t0 = 0;
let manual = false;
let snapshot: AppState | null = null;
let storyT = 0;
let clock: () => number = () => performance.now();
let removeKeys: (() => void) | null = null;

/** Una frase que llega más de este tiempo tarde (pestaña oculta, equipo trabado) se descarta: no pisa a la siguiente. */
const VOICE_LATE_S = 0.6;

function applyCue(c: Cue, e: number) {
  switch (c.kind) {
    case 'voice':
      if (e - c.at <= VOICE_LATE_S) speak(c.id);
      break;
    case 'cursor':
      emit({ cursor: c.goal });
      break;
    case 'click':
      emit({ pulse: state.pulse + 1 });
      break;
    case 'ring':
      emit({ ring: c.target });
      break;
    case 'module':
      openModule(c.module);
      setApp({ ...EXPLORE_START });
      break;
    case 'filters':
      setFilters(c.patch);
      break;
    case 'app':
      setApp(c.patch);
      break;
    case 'evidence':
      setApp({ evidenceEventId: c.id });
      break;
  }
}

const hooks: Hooks = {
  film: (t) => seekNow(t),
  cue: applyCue,
  look: (v) => {
    if (!v) {
      resetLook();
      return;
    }
    live.look.dAz = v.dAz;
    live.look.dEl = v.dEl;
    live.look.zoom = v.zoom;
    live.look.active = true;
  },
  track: (v) => {
    const patch: Partial<AppState> = {};
    if (v.travesiaT != null) patch.travesiaT = v.travesiaT;
    if (v.busquedaT != null) patch.busquedaT = v.busquedaT;
    if (v.depth != null) patch.depth = v.depth;
    if (Object.keys(patch).length) setApp(patch);
  },
  drag: (v) => emit({ drag: v }),
  ui: (s) => {
    const p = state;
    if (p.caption === s.caption && p.chapter === s.chapter && p.fade === s.fade && p.e === s.e && (s.ended ? p.phase === 'ended' : p.phase === 'running')) return;
    emit({ e: s.e, caption: s.caption, chapter: s.chapter, fade: s.fade, phase: s.ended ? 'ended' : 'running' });
  },
};

function step(now: number) {
  if (!runner) return;
  runner.advance((now - t0) / 1000);
  if (runner.ended) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

function loop() {
  raf = requestAnimationFrame(loop);
  step(clock());
}

/** Tras cambiar de modo, espera a que React monte la interfaz antes de tocar el relato. */
const afterMount = (fn: () => void) => window.setTimeout(fn, 80);

function installKeys() {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      exitTour('close');
      return;
    }
    // Nada de lo demás debe mover la página mientras corre el tour.
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  window.addEventListener('keydown', onKey, true);
  removeKeys = () => window.removeEventListener('keydown', onKey, true);
}

function begin(isManual: boolean) {
  if (state.phase === 'running') return;
  void startAudio();
  // Narración: descarga (si falta) y decodifica los clips con el contexto que acaba de crear el clic.
  preloadVoiceFiles();
  void decodeVoice();
  snapshot = appStore.get();
  storyT = storyStore.get().t;
  setStoryLocked(true);
  document.body.classList.add('touring');
  stopStory();
  setApp({ ...CLEAN, mode: 'story' });
  resetLook();
  if (location.hash === '#tour') history.replaceState(null, '', location.pathname + location.search);
  runner = new TourRunner(hooks);
  state = { ...INITIAL, phase: 'running' };
  listeners.forEach((l) => l());
  installKeys();
  manual = isManual;
  t0 = clock();
  runner.advance(0);
  if (!manual) raf = requestAnimationFrame(loop);
}

/** Arranca el tour (desde un clic del usuario: así también se habilita el sonido). */
export function startTour() {
  begin(false);
}

/** Sale del tour y deja la página en el estado indicado. */
export function exitTour(kind: 'close' | 'film' | 'explore' | 'repeat') {
  cancelAnimationFrame(raf);
  raf = 0;
  runner = null;
  removeKeys?.();
  removeKeys = null;
  stopSpeaking();
  document.body.classList.remove('touring');
  setStoryLocked(false);
  resetLook();
  const snap = snapshot;
  snapshot = null;
  state = INITIAL;
  listeners.forEach((l) => l());
  if (kind === 'explore') {
    openModule('vidas');
    setApp({ ...CLEAN });
    return;
  }
  setApp({ ...(snap ?? {}), ...CLEAN, mode: snap?.mode ?? 'story', module: snap?.module ?? 'vidas', panelOpen: snap?.panelOpen ?? true, layers: snap?.layers ?? appStore.get().layers });
  if (kind === 'repeat') {
    afterMount(startTour);
    return;
  }
  const toFilm = kind === 'film';
  afterMount(() => {
    if (appStore.get().mode !== 'story') return;
    seekNow(toFilm ? 0 : storyT);
    if (toFilm) {
      void startAudio();
      play();
    }
  });
}

/** Con `#tour` en la dirección se muestra una tarjeta «Comenzar» (el navegador necesita un clic para el sonido). */
export function initTourLink() {
  if (location.hash === '#tour' && state.phase === 'idle') emit({ phase: 'gate' });
}

export function dismissGate() {
  if (state.phase === 'gate') {
    if (location.hash === '#tour') history.replaceState(null, '', location.pathname + location.search);
    emit({ phase: 'idle' });
  }
}

// Sólo en desarrollo: pruebas con un reloj propio (la pestaña oculta del navegador de pruebas no dibuja cuadros).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __tour?: unknown }).__tour = {
    begin: () => begin(true),
    at: (e: number) => {
      if (!runner) begin(true);
      runner!.advance(e);
    },
    exit: (k: 'close' | 'film' | 'explore' | 'repeat' = 'close') => exitTour(k),
    state: () => state,
    seconds: TOUR_SECONDS,
    useClock: (fn: () => number) => {
      clock = fn;
    },
  };
}
