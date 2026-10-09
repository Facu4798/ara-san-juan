import { useSyncExternalStore } from 'react';
import { beats, BEAT_START, TOTAL_SECONDS } from './beats';

/**
 * CONTROLADOR DEL RELATO.
 *
 * La posición de scroll dentro de #story es la ENTRADA (accesible, funciona con rueda, teclado y
 * gestos). El tiempo que ve la escena, `t`, es la SALIDA y se mueve con inercia: un bucle por
 * cuadro hace que `t` persiga a la entrada con amortiguación exponencial, así la rueda del mouse
 * (que avanza a saltos) no produce saltos en la cámara. Durante la reproducción o un vuelo
 * (`flyTo`) `t` avanza exacto, sin retraso.
 */
export const VH_PER_SECOND = 22;

export interface StoryState {
  /** Segundo del guion (0 a TOTAL_SECONDS), ya suavizado. */
  t: number;
  /** Índice del momento actual. */
  index: number;
  /** Avance dentro del momento (0 a 1). */
  p: number;
  playing: boolean;
  /** true mientras viaja a un hito o a un momento (vuelo suave). */
  flying: boolean;
  /** false cuando se pasó al anexo de metodología. */
  inStory: boolean;
}

let state: StoryState = { t: 0, index: 0, p: 0, playing: false, flying: false, inStory: true };
const listeners = new Set<() => void>();
const emit = (next: StoryState) => {
  state = next;
  listeners.forEach((l) => l());
};

export const storyStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  get: () => state,
};

/** Estado completo: re-renderiza en cada cambio de tiempo. Usar en componentes livianos. */
export function useStory() {
  return useSyncExternalStore(storyStore.subscribe, storyStore.get, storyStore.get);
}

/** Selector con valor primitivo: re-renderiza sólo cuando ese valor cambia. */
export function useStorySelector<T extends string | number | boolean>(sel: (s: StoryState) => T): T {
  return useSyncExternalStore(storyStore.subscribe, () => sel(state), () => sel(state));
}

const storyEl = () => document.getElementById('story');

/** Alto total de la sección del relato (CSS): segundos × vh + una pantalla final. */
export const storyHeightVh = TOTAL_SECONDS * VH_PER_SECOND + 100;

/**
 * Píxeles de scroll por segundo del guion. Se deduce del alto real de #story (que está en vh) y no de
 * window.innerHeight: en celulares innerHeight cambia al ocultarse la barra del navegador y movería el tiempo.
 */
const pxPerSecond = () => {
  const h = storyEl()?.offsetHeight;
  return h ? (h * VH_PER_SECOND) / storyHeightVh : (window.innerHeight * VH_PER_SECOND) / 100;
};

export function locate(t: number): { index: number; p: number } {
  let index = beats.length - 1;
  for (let i = 0; i < beats.length; i++) {
    if (t < BEAT_START[i] + beats[i].dur) {
      index = i;
      break;
    }
  }
  const p = Math.min(1, Math.max(0, (t - BEAT_START[index]) / beats[index].dur));
  return { index, p };
}

/** Entrada: tiempo que indica el scroll. */
let scrollT = 0;
let rafFollow = 0;
let lastFollow = 0;
/** Constante de tiempo (s) con que `t` persigue al scroll cuando el usuario manda. */
const FOLLOW_TAU = 0.16;

function setT(t: number, extra: Partial<StoryState> = {}) {
  const c = Math.min(TOTAL_SECONDS, Math.max(0, t));
  const { index, p } = locate(c);
  if (c === state.t && index === state.index && Object.keys(extra).every((k) => (state as unknown as Record<string, unknown>)[k] === (extra as Record<string, unknown>)[k])) return;
  emit({ ...state, ...extra, t: c, index, p });
}

/** Sólo desarrollo: congela el tiempo para tomar capturas exactas. */
let devLock = false;

function readScroll() {
  const el = storyEl();
  if (!el || devLock) return;
  const d = window.scrollY - el.offsetTop;
  scrollT = Math.min(TOTAL_SECONDS, Math.max(0, d / pxPerSecond()));
  const inStory = d < TOTAL_SECONDS * pxPerSecond() + window.innerHeight * 0.6;
  if (inStory !== state.inStory) emit({ ...state, inStory });
  // En reproducción y en vuelo el tiempo lo fija el bucle respectivo, no el scroll.
  if (state.playing || state.flying) return;
  ensureFollow();
}

function ensureFollow() {
  if (rafFollow || state.playing || state.flying) return;
  lastFollow = performance.now();
  rafFollow = requestAnimationFrame(follow);
}

function follow(now: number) {
  rafFollow = 0;
  if (state.playing || state.flying) return;
  const dt = Math.min(0.1, (now - lastFollow) / 1000);
  lastFollow = now;
  const diff = scrollT - state.t;
  if (Math.abs(diff) < 0.0006) {
    setT(scrollT);
    return;
  }
  setT(state.t + diff * (1 - Math.exp(-dt / FOLLOW_TAU)));
  rafFollow = requestAnimationFrame(follow);
}

const scrollToT = (t: number) => {
  const el = storyEl();
  if (!el) return;
  window.scrollTo({ top: el.offsetTop + t * pxPerSecond(), behavior: 'instant' as ScrollBehavior });
};

// ——— Reproducción y vuelos ———
let raf = 0;
let last = 0;
let target = TOTAL_SECONDS;
let speed = 1;

function tick(now: number) {
  // Tope alto: aunque el equipo dibuje pocos cuadros por segundo, la exposición dura lo previsto.
  const dt = Math.min(0.5, (now - last) / 1000);
  last = now;
  const next = Math.min(target, state.t + dt * speed);
  scrollToT(next);
  scrollT = next;
  setT(next);
  if (next >= target - 1e-4) {
    stop();
    return;
  }
  raf = requestAnimationFrame(tick);
}

function run(to: number, sp: number) {
  cancelAnimationFrame(raf);
  cancelAnimationFrame(rafFollow);
  rafFollow = 0;
  // Sin la sección del relato (modo exploración) no hay nada que reproducir.
  if (!storyEl()) return;
  target = Math.min(TOTAL_SECONDS, to);
  speed = sp;
  last = performance.now();
  emit({ ...state, playing: true, flying: false });
  raf = requestAnimationFrame(tick);
}

export function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
  if (state.playing || state.flying) {
    scrollT = state.t;
    emit({ ...state, playing: false, flying: false });
  }
}

/** Modo exposición: recorre el guion completo a velocidad real (70 s). */
export function play() {
  const from = state.t >= TOTAL_SECONDS - 0.05 ? 0 : state.t;
  if (from === 0) {
    scrollToT(0);
    scrollT = 0;
    setT(0);
  }
  run(TOTAL_SECONDS, 1);
}

export function togglePlay() {
  if (state.playing) stop();
  else play();
}

/** Vuelo suave hacia un instante: la escena viaja (la cámara recorre el camino) en lugar de saltar. */
let flightRaf = 0;
export function flyTo(t: number, seconds?: number) {
  cancelAnimationFrame(raf);
  cancelAnimationFrame(rafFollow);
  cancelAnimationFrame(flightRaf);
  rafFollow = 0;
  if (!storyEl()) return;
  const to = Math.min(TOTAL_SECONDS, Math.max(0, t));
  const from = state.t;
  const dist = Math.abs(to - from);
  if (dist < 0.02) {
    seekNow(to);
    return;
  }
  const dur = seconds ?? Math.min(2.8, 0.9 + 0.13 * dist);
  const t0 = performance.now();
  emit({ ...state, playing: false, flying: true });
  const step = (now: number) => {
    const u = Math.min(1, (now - t0) / (dur * 1000));
    const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; // ease in-out cúbico
    const v = from + (to - from) * e;
    scrollToT(v);
    scrollT = v;
    setT(v);
    if (u < 1) flightRaf = requestAnimationFrame(step);
    else {
      flightRaf = 0;
      emit({ ...state, flying: false });
    }
  };
  flightRaf = requestAnimationFrame(step);
}

/** Salto inmediato (arrastre de la barra de tiempo): la escena responde en el acto. */
export function seekNow(t: number) {
  cancelAnimationFrame(raf);
  cancelAnimationFrame(rafFollow);
  cancelAnimationFrame(flightRaf);
  rafFollow = 0;
  flightRaf = 0;
  const c = Math.min(TOTAL_SECONDS, Math.max(0, t));
  scrollToT(c);
  scrollT = c;
  emit({ ...state, playing: false, flying: false });
  setT(c);
}

/** Punto de lectura de un momento: su texto principal ya está a la vista. */
const restT = (i: number) => BEAT_START[i] + beats[i].dur * 0.55;

/** Siguiente momento: la escena viaja hasta su punto de lectura. */
export function next() {
  const i = state.index;
  flyTo(state.t < restT(i) - 0.15 ? restT(i) : restT(Math.min(beats.length - 1, i + 1)));
}

export function prev() {
  const i = state.index;
  flyTo(state.t > restT(i) + 0.15 ? restT(i) : restT(Math.max(0, i - 1)));
}

export function goToBeat(i: number) {
  flyTo(restT(i));
}

/** Reinicia la película desde el principio. */
export function restart() {
  seekNow(0);
}

/** Conecta scroll, teclado y gestos. Devuelve la función de limpieza. */
export function installStoryDriver(): () => void {
  let pending = 0;
  const onScroll = () => {
    if (!pending) pending = requestAnimationFrame(() => {
      pending = 0;
      readScroll();
    });
  };
  // Cualquier gesto de scroll del usuario toma el control y pausa la reproducción.
  const onUserScroll = () => {
    if (state.playing || state.flying) {
      cancelAnimationFrame(flightRaf);
      stop();
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (!storyEl() || !state.inStory || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      next();
    } else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prev();
    } else if (e.key === 'Escape') {
      stop();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      onUserScroll();
    } else if (e.key === 'r' || e.key === 'R') {
      restart();
    }
  };
  readScroll();
  setT(scrollT);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('wheel', onUserScroll, { passive: true });
  window.addEventListener('touchstart', onUserScroll, { passive: true });
  window.addEventListener('keydown', onKey);
  return () => {
    stop();
    cancelAnimationFrame(pending);
    cancelAnimationFrame(rafFollow);
    cancelAnimationFrame(flightRaf);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    window.removeEventListener('wheel', onUserScroll);
    window.removeEventListener('touchstart', onUserScroll);
    window.removeEventListener('keydown', onKey);
  };
}

// Sólo en desarrollo: atajo para saltar a cualquier instante desde la consola del navegador.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __story?: unknown }).__story = {
    seekNow, flyTo, play, stop, storyStore, TOTAL_SECONDS,
    freeze: (t: number) => { devLock = false; seekNow(t); devLock = true; },
    unfreeze: () => { devLock = false; },
  };
}
