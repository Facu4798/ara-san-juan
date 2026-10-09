/**
 * MOTOR DE SONIDO.
 *
 * Todo el sonido se SINTETIZA en el navegador (Web Audio API): no hay grabaciones del submarino,
 * del mar ni del evento del 15/11/2017. Es diseño sonoro, no dato, y así se declara en la
 * metodología. No hay narración por voz.
 *
 * Este módulo maneja el contexto de audio, el bus maestro (compresor + limitador), la reverb larga,
 * el volumen y el silencio del usuario, y la evidencia sonora opcional. Las capas del viaje (mar,
 * hélice, sonar, crujidos, latido, tensión, colapso, memoria) viven en layers.ts.
 */
import type { SoundScene } from '../story/beats';
import { DEFAULT_ENV, Layers, impulseResponse, type AudioEnv, type Cue } from './layers';

export type { Cue, AudioEnv } from './layers';

interface AudioState {
  ready: boolean;
  muted: boolean;
  /** true mientras suena un audio de evidencia (el ambiente se atenúa). */
  evidencePlaying: boolean;
  /** Volumen elegido por el usuario (0 a 1). */
  volume: number;
}

let state: AudioState = { ready: false, muted: false, evidencePlaying: false, volume: 0.8 };
const listeners = new Set<() => void>();
const emit = (patch: Partial<AudioState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const audioStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  get: () => state,
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambient: GainNode | null = null;
let layers: Layers | null = null;

/** Entorno vigente. Los módulos de exploración sólo fijan escena y profundidad; el viaje fija todo. */
let env: AudioEnv = { ...DEFAULT_ENV };
const MASTER = 0.85;

/**
 * Grafo de audio: bus maestro (compresor suave + limitador, para que ni el estruendo ni la suma de capas
 * recorten), reverb larga (sonar, crujidos, colapso y campanillas), buses de ambiente y efectos y las capas.
 */
function buildGraph(c: BaseAudioContext) {
  const master = c.createGain();
  master.gain.value = 0;
  const glue = c.createDynamicsCompressor();
  glue.threshold.value = -20;
  glue.knee.value = 14;
  glue.ratio.value = 3;
  glue.attack.value = 0.01;
  glue.release.value = 0.25;
  const limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.12;
  master.connect(glue).connect(limiter).connect(c.destination);

  const conv = c.createConvolver();
  conv.buffer = impulseResponse(c, 3.4);
  const reverb = c.createGain();
  reverb.gain.value = 0.55;
  reverb.connect(conv);
  const wet = c.createGain();
  wet.gain.value = 0.7;
  conv.connect(wet).connect(master);

  const ambient = c.createGain();
  ambient.gain.value = 1;
  ambient.connect(master);
  const fx = c.createGain();
  fx.gain.value = 1;
  fx.connect(master);

  return { master, ambient, layers: new Layers(c, { ambient, fx, reverb }) };
}

/** Debe llamarse desde un gesto del usuario (los navegadores bloquean el audio automático). */
export async function start() {
  if (ctx) {
    await ctx.resume();
    if (!state.ready) emit({ ready: true });
    return;
  }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
  const c = ctx;
  await c.resume();

  const g = buildGraph(c);
  master = g.master;
  ambient = g.ambient;
  layers = g.layers;
  layers.setEnv(env, 2.5);

  emit({ ready: true });
  master.gain.setTargetAtTime(state.muted ? 0 : MASTER * state.volume, c.currentTime, 1.2);
}

function applyEnv(tc?: number) {
  layers?.setEnv(env, tc);
}

/** Entorno completo del viaje (se llama varias veces por segundo). */
export function setEnv(e: AudioEnv) {
  env = e;
  applyEnv();
}

/** Escena sonora (módulos de exploración). */
export function setScene(s: SoundScene) {
  if (s === env.scene) return;
  env = { ...env, scene: s };
  applyEnv(0.6);
}

/** Profundidad en metros (módulos de exploración): cierra el filtro del mar y acerca el retumbo. */
export function setDepth(d: number) {
  if (Math.abs(d - env.depthM) < 1) return;
  env = { ...env, depthM: d, under: d > 2 };
  applyEnv(0.5);
}

export function setMuted(m: boolean) {
  emit({ muted: m });
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : MASTER * state.volume, ctx.currentTime, 0.3);
  if (m) stopEvidence();
}

export function setVolume(v: number) {
  const vol = Math.min(1, Math.max(0, v));
  emit({ volume: vol, muted: vol === 0 ? true : state.muted && vol > 0 ? false : state.muted });
  if (ctx && master) master.gain.setTargetAtTime(state.muted ? 0 : MASTER * vol, ctx.currentTime, 0.15);
}

/** Eventos puntuales: ping, teletipo, radio, silencio previo, colapso, campanillas… */
export function cue(name: Cue) {
  if (!ctx || !layers || state.muted) return;
  layers.cue(name);
}

/** Vuelve al estado previo al colapso (cuando se retrocede en la película). */
export function resetStory() {
  layers?.reset();
}

// ——— Evidencia sonora (sólo con un clic) ———
let evidenceEl: HTMLAudioElement | null = null;

export function playEvidence(url: string) {
  stopEvidence();
  if (!state.ready || state.muted) return;
  evidenceEl = new Audio(url);
  evidenceEl.onended = () => stopEvidence();
  evidenceEl.onerror = () => stopEvidence();
  emit({ evidencePlaying: true });
  if (ambient && ctx) ambient.gain.setTargetAtTime(0.3, ctx.currentTime, 0.3);
  void evidenceEl.play().catch(() => stopEvidence());
}

export function stopEvidence() {
  if (evidenceEl) {
    evidenceEl.onended = null;
    evidenceEl.onerror = null;
    evidenceEl.pause();
    evidenceEl = null;
  }
  if (state.evidencePlaying) {
    emit({ evidencePlaying: false });
    if (ambient && ctx) ambient.gain.setTargetAtTime(1, ctx.currentTime, 0.5);
  }
}

// Sólo en desarrollo: renderiza el colapso sin conectarlo a los parlantes y mide su nivel.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __audio?: unknown }).__audio = {
    async renderCollapse(seconds = 9) {
      const off = new OfflineAudioContext(2, Math.floor(44100 * seconds), 44100);
      const g = buildGraph(off);
      g.master.gain.value = MASTER * 0.8;
      g.layers.setEnv({ ...DEFAULT_ENV, scene: 'colapso', depthM: 745, under: true, stress: 0.9, speedKn: 0 }, 0.01);
      g.layers.collapse();
      const buf = await off.startRendering();
      g.layers.dispose();
      let peak = 0;
      let sum = 0;
      let n = 0;
      const bySecond: number[] = [];
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < d.length; i++) {
          const a = Math.abs(d[i]);
          if (a > peak) peak = a;
          sum += d[i] * d[i];
          n++;
          if (ch === 0) {
            const sec = Math.floor(i / 44100);
            bySecond[sec] = Math.max(bySecond[sec] ?? 0, a);
          }
        }
      }
      return { peakDb: 20 * Math.log10(peak || 1e-9), rmsDb: 10 * Math.log10(sum / n || 1e-12), bySecondDb: bySecond.map((v) => +(20 * Math.log10(v || 1e-9)).toFixed(1)) };
    },
  };
}
