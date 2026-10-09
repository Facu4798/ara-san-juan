import { useSyncExternalStore } from 'react';
import { beats, BEAT_START, TOTAL_SECONDS } from './beats';

/**
 * CONTROLADOR DEL RELATO.
 *
 * Una única fuente de verdad: la posición de scroll dentro de #story. Cada segundo del guion
 * ocupa VH_PER_SECOND de alto de pantalla. La reproducción automática («modo exposición»)
 * no tiene un reloj propio: mueve el scroll a velocidad constante, así que scroll, teclado y
 * reproducción nunca se desincronizan.
 */
export const VH_PER_SECOND = 22;

export interface StoryState {
  /** Segundo del guion (0 a TOTAL_SECONDS). */
  t: number;
  /** Índice del momento actual. */
  index: number;
  /** Avance dentro del momento (0 a 1). */
  p: number;
  playing: boolean;
  /** false cuando se pasó al anexo de metodología. */
  inStory: boolean;
}

let state: StoryState = { t: 0, index: 0, p: 0, playing: false, inStory: true };
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

/** Estado completo: re-renderiza en cada cambio de scroll. Usar en componentes livianos. */
export function useStory() {
  return useSyncExternalStore(storyStore.subscribe, storyStore.get, storyStore.get);
}

/** Selector con valor primitivo: re-renderiza sólo cuando ese valor cambia. */
export function useStorySelector<T extends string | number | boolean>(sel: (s: StoryState) => T): T {
  return useSyncExternalStore(storyStore.subscribe, () => sel(state), () => sel(state));
}

const pxPerSecond = () => (window.innerHeight * VH_PER_SECOND) / 100;
const storyEl = () => document.getElementById('story');

/** Alto total de la sección del relato (CSS): segundos × vh + una pantalla final. */
export const storyHeightVh = TOTAL_SECONDS * VH_PER_SECOND + 100;

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

function readScroll() {
  const el = storyEl();
  if (!el) return;
  const d = window.scrollY - el.offsetTop;
  const t = Math.min(TOTAL_SECONDS, Math.max(0, d / pxPerSecond()));
  const { index, p } = locate(t);
  const inStory = d < TOTAL_SECONDS * pxPerSecond() + window.innerHeight * 0.6;
  if (Math.abs(t - state.t) < 0.0005 && inStory === state.inStory && index === state.index) return;
  emit({ ...state, t, index, p, inStory });
}

const scrollToT = (t: number) => {
  const el = storyEl();
  if (!el) return;
  window.scrollTo({ top: el.offsetTop + t * pxPerSecond(), behavior: 'instant' as ScrollBehavior });
};

// ——— Reproducción ———
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
  readScroll();
  if (next >= target - 1e-4) {
    stop();
    return;
  }
  raf = requestAnimationFrame(tick);
}

function run(to: number, sp: number) {
  cancelAnimationFrame(raf);
  // Sin la sección del relato (modo exploración) no hay nada que reproducir.
  if (!storyEl()) return;
  target = Math.min(TOTAL_SECONDS, to);
  speed = sp;
  last = performance.now();
  emit({ ...state, playing: true });
  raf = requestAnimationFrame(tick);
}

export function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
  if (state.playing) emit({ ...state, playing: false });
}

/** Modo exposición: recorre el guion completo a velocidad real (~1 minuto). */
export function play() {
  const from = state.t >= TOTAL_SECONDS - 0.05 ? 0 : state.t;
  if (from === 0) scrollToT(0);
  readScroll();
  run(TOTAL_SECONDS, 1);
}

export function togglePlay() {
  if (state.playing) stop();
  else play();
}

/** Punto de lectura de un momento: su texto principal ya está a la vista. */
const restT = (i: number) => BEAT_START[i] + beats[i].dur * 0.55;

/** Siguiente momento: reproduce lo que falta (al doble de velocidad) hasta su punto de lectura. */
export function next() {
  const i = state.index;
  const to = state.t < restT(i) - 0.15 ? restT(i) : restT(Math.min(beats.length - 1, i + 1));
  run(to, 2.2);
}

export function prev() {
  stop();
  const i = state.index;
  const to = state.t > restT(i) + 0.15 ? restT(i) : restT(Math.max(0, i - 1));
  scrollToT(to);
  readScroll();
}

export function goToBeat(i: number) {
  stop();
  scrollToT(restT(i));
  readScroll();
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
    if (state.playing) stop();
  };
  const onKey = (e: KeyboardEvent) => {
    if (!storyEl() || !state.inStory || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !(e.target instanceof HTMLButtonElement))) {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prev();
    } else if (e.key === 'Escape') {
      stop();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      onUserScroll();
    }
  };
  readScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('wheel', onUserScroll, { passive: true });
  window.addEventListener('touchstart', onUserScroll, { passive: true });
  window.addEventListener('keydown', onKey);
  return () => {
    stop();
    cancelAnimationFrame(pending);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    window.removeEventListener('wheel', onUserScroll);
    window.removeEventListener('touchstart', onUserScroll);
    window.removeEventListener('keydown', onKey);
  };
}
