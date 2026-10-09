/**
 * MOTOR DE SONIDO AMBIENTE.
 *
 * Todo el sonido se SINTETIZA en el navegador (Web Audio API): no hay grabaciones del
 * submarino, del mar ni del evento del 15/11/2017. Es diseño sonoro, no dato, y así se
 * declara en la metodología. No hay narración por voz.
 *
 * Tres capas que se mezclan según el momento del relato:
 *   mar      ruido filtrado con oleaje lento (superficie)
 *   casco    zumbido grave de máquinas y ventilación (interior de un submarino)
 *   profundo retumbo muy grave que se cierra con la profundidad
 * Nunca se llega a silencio total: el ambiente acompaña siempre, también en «El silencio».
 * Las señales puntuales (ping, tic, ola de presión) son deliberadamente tenues.
 */
import type { SoundScene } from '../story/beats';

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
let seaGain: GainNode | null = null;
let seaFilter: BiquadFilterNode | null = null;
let hullGain: GainNode | null = null;
let deepGain: GainNode | null = null;
let deepFilter: BiquadFilterNode | null = null;
let echo: DelayNode | null = null;

let scene: SoundScene = 'superficie';
let depth = 0;
const MASTER = 0.85;

/** Ruido rosa (oleaje, ventilación). */
function pinkNoise(c: AudioContext, seconds = 6): AudioBuffer {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.16;
  }
  return buf;
}

/** Ruido marrón (retumbo profundo). */
function brownNoise(c: AudioContext, seconds = 6): AudioBuffer {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.2;
  }
  return buf;
}

function loop(c: AudioContext, buf: AudioBuffer) {
  const s = c.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.start();
  return s;
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

  master = c.createGain();
  master.gain.value = 0;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  master.connect(comp).connect(c.destination);

  // Eco largo y suave para las señales puntuales.
  echo = c.createDelay(1.5);
  echo.delayTime.value = 0.42;
  const fb = c.createGain();
  fb.gain.value = 0.35;
  const wet = c.createGain();
  wet.gain.value = 0.4;
  echo.connect(fb).connect(echo);
  echo.connect(wet).connect(master);

  // ——— Mar: ruido rosa con un oleaje lento que modula volumen y brillo ———
  seaGain = c.createGain();
  seaGain.gain.value = 0;
  seaFilter = c.createBiquadFilter();
  seaFilter.type = 'lowpass';
  seaFilter.frequency.value = 700;
  const swell = c.createGain();
  swell.gain.value = 0.7;
  loop(c, pinkNoise(c)).connect(seaFilter).connect(swell).connect(seaGain).connect(master);
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.085;
  const lfoDepth = c.createGain();
  lfoDepth.gain.value = 0.3;
  lfo.connect(lfoDepth).connect(swell.gain);
  lfo.start();
  const lfo2 = c.createOscillator();
  lfo2.frequency.value = 0.13;
  const lfo2Depth = c.createGain();
  lfo2Depth.gain.value = 180;
  lfo2.connect(lfo2Depth).connect(seaFilter.frequency);
  lfo2.start();

  // ——— Casco: zumbido de máquinas y siseo de ventilación ———
  hullGain = c.createGain();
  hullGain.gain.value = 0;
  const hullFilter = c.createBiquadFilter();
  hullFilter.type = 'lowpass';
  hullFilter.frequency.value = 420;
  hullGain.connect(master);
  hullFilter.connect(hullGain);
  [
    [55, 'sine', 0.55],
    [110.4, 'triangle', 0.16],
    [165.3, 'sine', 0.06],
  ].forEach(([f, type, g]) => {
    const o = c.createOscillator();
    o.type = type as OscillatorType;
    o.frequency.value = f as number;
    const og = c.createGain();
    og.gain.value = g as number;
    o.connect(og).connect(hullFilter);
    o.start();
  });
  const vent = c.createBiquadFilter();
  vent.type = 'bandpass';
  vent.frequency.value = 950;
  vent.Q.value = 0.8;
  const ventGain = c.createGain();
  ventGain.gain.value = 0.22;
  loop(c, pinkNoise(c, 5)).connect(vent).connect(ventGain).connect(hullGain);

  // ——— Profundo: retumbo grave que se oscurece con la profundidad ———
  deepGain = c.createGain();
  deepGain.gain.value = 0;
  deepFilter = c.createBiquadFilter();
  deepFilter.type = 'lowpass';
  deepFilter.frequency.value = 220;
  loop(c, brownNoise(c)).connect(deepFilter).connect(deepGain).connect(master);

  emit({ ready: true });
  master.gain.setTargetAtTime(state.muted ? 0 : MASTER * state.volume, c.currentTime, 1.2);
  applyMix(2.5);
}

/** Niveles de cada capa por escena. Ninguna escena deja el ambiente en cero. */
function mix(): { sea: number; hull: number; deep: number; seaCut: number; deepCut: number } {
  const k = Math.min(1, Math.max(0, depth / 907));
  switch (scene) {
    case 'superficie':
      return { sea: 0.5, hull: 0, deep: 0.04, seaCut: 900, deepCut: 220 };
    case 'mapa':
      return { sea: 0.32, hull: 0.1, deep: 0.06, seaCut: 750, deepCut: 220 };
    case 'casco':
      return { sea: 0.16, hull: 0.42, deep: 0.06, seaCut: 600, deepCut: 220 };
    case 'silencio':
      // Se apaga el casco: las comunicaciones se cortaron. Queda el mar, lejano.
      return { sea: 0.2, hull: 0, deep: 0.1, seaCut: 420, deepCut: 200 };
    case 'profundo':
      return { sea: 0.3 * (1 - k) + 0.02, hull: 0, deep: 0.12 + 0.3 * k, seaCut: 700 - 560 * k, deepCut: 220 - 120 * k };
    case 'concepto':
      return { sea: 0.03, hull: 0, deep: 0.22, seaCut: 300, deepCut: 120 };
    case 'memoria':
      return { sea: 0.42, hull: 0, deep: 0.05, seaCut: 820, deepCut: 220 };
  }
}

function applyMix(tc = 0.8) {
  if (!ctx || !seaGain || !hullGain || !deepGain || !seaFilter || !deepFilter) return;
  const m = mix();
  const duck = state.evidencePlaying ? 0.3 : 1;
  const now = ctx.currentTime;
  seaGain.gain.setTargetAtTime(m.sea * duck, now, tc);
  hullGain.gain.setTargetAtTime(m.hull * duck, now, tc);
  deepGain.gain.setTargetAtTime(m.deep * duck, now, tc);
  seaFilter.frequency.setTargetAtTime(m.seaCut, now, tc);
  deepFilter.frequency.setTargetAtTime(m.deepCut, now, tc);
}

export function setScene(s: SoundScene) {
  if (s === scene) return;
  scene = s;
  applyMix(1.1);
}

/** Profundidad en metros: cierra el filtro del mar y acerca el retumbo. */
export function setDepth(d: number) {
  if (Math.abs(d - depth) < 1) return;
  depth = d;
  if (scene === 'profundo') applyMix(0.5);
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

export type Cue = 'ping' | 'tick' | 'swell';

/** Señales puntuales, muy tenues. */
export function cue(name: Cue) {
  if (!ctx || !master || state.muted) return;
  const c = ctx;
  const t = c.currentTime;
  const env = (g: GainNode, t0: number, peak: number, attack: number, release: number) => {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + release);
  };

  if (name === 'ping') {
    // Señal de sonar lejana: marca la llegada a un lugar documentado.
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1180, t);
    o.frequency.exponentialRampToValueAtTime(940, t + 0.6);
    const g = c.createGain();
    env(g, t, 0.028, 0.02, 1.4);
    o.connect(g).connect(master);
    if (echo) g.connect(echo);
    o.start(t);
    o.stop(t + 1.6);
    return;
  }

  if (name === 'tick') {
    // Teletipo: aparece un documento.
    for (let i = 0; i < 3; i++) {
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = 1650;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2400;
      const g = c.createGain();
      const t0 = t + i * 0.09;
      env(g, t0, 0.01, 0.003, 0.04);
      o.connect(f).connect(g).connect(master);
      o.start(t0);
      o.stop(t0 + 0.06);
    }
    return;
  }

  // swell: ola de presión muy grave y lenta para la representación conceptual. No es un estruendo.
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(42, t);
  o.frequency.exponentialRampToValueAtTime(28, t + 3);
  const g = c.createGain();
  env(g, t, 0.16, 0.9, 2.8);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 4);
  const n = c.createBufferSource();
  n.buffer = brownNoise(c, 2);
  const nf = c.createBiquadFilter();
  nf.type = 'lowpass';
  nf.frequency.value = 160;
  const ng = c.createGain();
  env(ng, t + 0.6, 0.08, 0.15, 1.6);
  n.connect(nf).connect(ng).connect(master);
  n.start(t + 0.6);
  n.stop(t + 2.6);
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
  applyMix(0.4);
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
    applyMix(0.6);
  }
}
