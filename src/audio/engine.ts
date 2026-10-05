/**
 * Motor de audio.
 *
 * TODO el sonido es SINTETIZADO en el navegador con la Web Audio API: no hay
 * ninguna grabación del submarino, del mar ni del evento del 15/11/2017.
 * Es diseño sonoro, no dato. Se declara así en la sección de metodología.
 *
 * Reglas:
 * - Nada suena hasta que la persona activa el sonido (además los navegadores
 *   bloquean el audio automático).
 * - `silenceAll()` corta todo: se usa en el evento de las 10:51 y durante el
 *   capítulo del silencio.
 */

export type EffectName = 'alarm' | 'ping' | 'creak' | 'tick' | 'reveal';

interface AudioState {
  ready: boolean;
  muted: boolean;
  subtitle: string | null;
  speaking: boolean;
  /** true si la narración usa archivos de voz propios en vez del sintetizador. */
  ownVoice: boolean;
  /** Aviso cuando la voz del navegador no está disponible o no es la esperada. */
  voiceInfo: string | null;
}

type Listener = () => void;

let state: AudioState = { ready: false, muted: false, subtitle: null, speaking: false, ownVoice: false, voiceInfo: null };
const listeners = new Set<Listener>();
const emit = (patch: Partial<AudioState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const audioStore = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  get: () => state,
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let droneA: OscillatorNode | null = null;
let droneB: OscillatorNode | null = null;
let droneGain: GainNode | null = null;
let hissFilter: BiquadFilterNode | null = null;
let hissGain: GainNode | null = null;
let echo: DelayNode | null = null;

let depth = 0;
let silence = false;
let ducked = false;
const crossed = new Set<number>();
const DEPTH_MARKS = [100, 300, 500, 700, 850];

let narrationEl: HTMLAudioElement | null = null;
let subtitleTimer: number | null = null;
let watchdog: number | null = null;
let manifest: Record<string, string> = {};

/** Ruido rosa: base del siseo de presión. */
function pinkNoise(c: AudioContext, seconds = 4): AudioBuffer {
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

async function loadManifest() {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}audio/manifest.json`);
    if (!r.ok) return;
    const json = (await r.json()) as { narracion?: Record<string, string> };
    manifest = json.narracion ?? {};
    if (Object.keys(manifest).length) emit({ ownVoice: true });
  } catch {
    manifest = {};
  }
}

/** Debe llamarse desde un gesto del usuario. */
export async function start() {
  if (ctx) {
    await ctx.resume();
    emit({ ready: true });
    return;
  }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
  await ctx.resume();

  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  echo = ctx.createDelay(1);
  echo.delayTime.value = 0.34;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const echoOut = ctx.createGain();
  echoOut.gain.value = 0.5;
  echo.connect(feedback).connect(echo);
  echo.connect(echoOut).connect(master);

  // Zumbido grave: dos osciladores apenas desafinados.
  droneGain = ctx.createGain();
  droneGain.gain.value = 0;
  const droneFilter = ctx.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 320;
  droneGain.connect(droneFilter).connect(master);
  droneA = ctx.createOscillator();
  droneA.type = 'sine';
  droneA.frequency.value = 46;
  droneB = ctx.createOscillator();
  droneB.type = 'triangle';
  droneB.frequency.value = 46.7;
  const bGain = ctx.createGain();
  bGain.gain.value = 0.35;
  droneA.connect(droneGain);
  droneB.connect(bGain).connect(droneGain);
  droneA.start();
  droneB.start();

  // Siseo de presión.
  const hiss = ctx.createBufferSource();
  hiss.buffer = pinkNoise(ctx);
  hiss.loop = true;
  hissFilter = ctx.createBiquadFilter();
  hissFilter.type = 'lowpass';
  hissFilter.frequency.value = 900;
  hissGain = ctx.createGain();
  hissGain.gain.value = 0;
  hiss.connect(hissFilter).connect(hissGain).connect(master);
  hiss.start();

  emit({ ready: true });
  setDepth(depth);
  void loadManifest();

  // Chrome entrega la lista de voces de forma asincrónica y a veces vacía en la
  // primera llamada: se fuerza la carga y se reintenta.
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.setTimeout(() => pickVoice(), 250);
    window.setTimeout(() => pickVoice(), 1500);
  }
}

/** Ayuda de diagnóstico: en la consola, `araVoces()` lista las voces disponibles. */
export function listVoices(): string[] {
  if (!('speechSynthesis' in window)) return ['sin síntesis de voz'];
  return window.speechSynthesis.getVoices().map((v) => `${v.name} · ${v.lang}${v.default ? ' (predeterminada)' : ''}`);
}

if (typeof window !== 'undefined') {
  (window as unknown as { araVoces: () => string[] }).araVoces = listVoices;
}

export function setMuted(m: boolean) {
  emit({ muted: m });
  if (m) stopNarration();
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.15);
}

const ambientLevel = () => (silence || state.muted ? 0 : 1) * (ducked ? 0.45 : 1);

/** Profundidad actual en metros: mueve el zumbido, el siseo y dispara umbrales. */
export function setDepth(d: number) {
  depth = d;
  if (!ctx || !droneA || !droneB || !droneGain || !hissFilter || !hissGain) return;
  const k = Math.min(1, Math.max(0, d / 907));
  const now = ctx.currentTime;
  const a = ambientLevel();
  droneA.frequency.setTargetAtTime(46 - 17 * k, now, 0.4);
  droneB.frequency.setTargetAtTime(46.7 - 17 * k, now, 0.4);
  droneGain.gain.setTargetAtTime(a * (0.05 + 0.11 * k), now, 0.5);
  hissFilter.frequency.setTargetAtTime(900 - 720 * k, now, 0.5);
  hissGain.gain.setTargetAtTime(a * (0.015 + 0.055 * k), now, 0.5);

  for (const th of DEPTH_MARKS) {
    if (d >= th && !crossed.has(th)) {
      crossed.add(th);
      effect(th === 100 ? 'alarm' : 'creak');
    } else if (d < th - 25) {
      crossed.delete(th);
    }
  }
}

export function effect(name: EffectName) {
  if (!ctx || !master || state.muted || silence) return;
  const c = ctx;
  const out = master;
  const t = c.currentTime;

  const env = (g: GainNode, t0: number, peak: number, attack: number, hold: number, release: number) => {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.setValueAtTime(peak, t0 + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  };

  if (name === 'alarm') {
    // Tres pulsos: marca el cruce del límite preventivo de 100 m.
    for (let i = 0; i < 3; i++) {
      const t0 = t + i * 0.36;
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = 740;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1700;
      const g = c.createGain();
      env(g, t0, 0.07, 0.015, 0.12, 0.14);
      o.connect(f).connect(g).connect(out);
      o.start(t0);
      o.stop(t0 + 0.34);
    }
    return;
  }

  if (name === 'ping') {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(980, t);
    o.frequency.exponentialRampToValueAtTime(760, t + 0.5);
    const g = c.createGain();
    env(g, t, 0.06, 0.01, 0.04, 1.1);
    o.connect(g).connect(out);
    if (echo) g.connect(echo);
    o.start(t);
    o.stop(t + 1.4);
    return;
  }

  if (name === 'creak') {
    // Ruido filtrado con barrido: tensión del casco. Representación, no registro.
    const src = c.createBufferSource();
    src.buffer = pinkNoise(c, 1.2);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 9;
    f.frequency.setValueAtTime(180 + Math.random() * 90, t);
    f.frequency.linearRampToValueAtTime(120 + Math.random() * 60, t + 0.9);
    const g = c.createGain();
    env(g, t, 0.12, 0.12, 0.2, 0.6);
    src.connect(f).connect(g).connect(out);
    src.start(t);
    src.stop(t + 1.1);
    return;
  }

  if (name === 'tick') {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = 1500;
    const g = c.createGain();
    env(g, t, 0.035, 0.005, 0.01, 0.05);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.1);
    return;
  }

  // reveal: acorde grave al llegar al fondo.
  [110, 164.8, 220].forEach((freq, i) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = c.createGain();
    env(g, t + i * 0.12, 0.05, 1.2, 0.8, 2.6);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 5.2);
  });
  effect('ping');
}

/** Corta todo el sonido. Se usa en el evento de las 10:51. */
export function silenceAll() {
  silence = true;
  stopNarration();
  if (!ctx || !droneGain || !hissGain) return;
  const now = ctx.currentTime;
  droneGain.gain.cancelScheduledValues(now);
  hissGain.gain.cancelScheduledValues(now);
  droneGain.gain.setTargetAtTime(0, now, 0.25);
  hissGain.gain.setTargetAtTime(0, now, 0.25);
}

export function resumeAmbient() {
  if (!silence) return;
  silence = false;
  setDepth(depth);
}

export const isSilenced = () => silence;

function duck(on: boolean) {
  ducked = on;
  setDepth(depth);
}

/**
 * Cierra la locución. `holdMs` es cuánto queda el subtítulo en pantalla; con
 * `keepSpeaking` el estado sigue en "hablando" durante ese rato, que es lo que
 * pasa cuando no hay voz instalada y el subtítulo hace de narración.
 */
function endNarration(holdMs = 900, keepSpeaking = false) {
  if (watchdog) window.clearTimeout(watchdog);
  watchdog = null;
  duck(false);
  if (subtitleTimer) window.clearTimeout(subtitleTimer);
  if (keepSpeaking) {
    subtitleTimer = window.setTimeout(() => emit({ subtitle: null, speaking: false }), holdMs);
  } else {
    emit({ speaking: false });
    subtitleTimer = window.setTimeout(() => emit({ subtitle: null }), holdMs);
  }
}

export function stopNarration() {
  if (narrationEl) {
    narrationEl.onended = null;
    narrationEl.onerror = null;
    narrationEl.pause();
    narrationEl = null;
  }
  speakToken++;
  if (pendingSpeak) window.clearTimeout(pendingSpeak);
  pendingSpeak = null;
  stopPump();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (subtitleTimer) window.clearTimeout(subtitleTimer);
  if (watchdog) window.clearTimeout(watchdog);
  watchdog = null;
  duck(false);
  emit({ speaking: false, subtitle: null });
}

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesChecked = false;

/** Elige la mejor voz disponible. Prefiere español rioplatense y baja de ahí. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase();
  const pref = ['es-ar', 'es-mx', 'es-us', 'es-cl', 'es-co', 'es-es', 'es'];
  for (const p of pref) {
    const v = voices.find((x) => lang(x).startsWith(p));
    if (v) {
      cachedVoice = v;
      voicesChecked = true;
      emit({ voiceInfo: null });
      return v;
    }
  }
  // Hay voces, pero ninguna en español: se usa la predeterminada y se avisa.
  voicesChecked = true;
  cachedVoice = voices.find((v) => v.default) ?? voices[0];
  emit({
    voiceInfo:
      'No hay voz en español instalada: se usa la voz predeterminada del navegador. Se puede agregar una en Configuración de Windows → Hora e idioma → Voz.',
  });
  return cachedVoice;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // En Chrome la lista de voces llega de forma asincrónica.
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoice = null;
    pickVoice();
  });
}

/** Chrome corta la locución alrededor de los 15 s si no se la "empuja". */
let pump: number | null = null;
const startPump = () => {
  stopPump();
  pump = window.setInterval(() => {
    const s = window.speechSynthesis;
    if (s.speaking && !s.paused) s.resume();
  }, 6000);
};
const stopPump = () => {
  if (pump) window.clearInterval(pump);
  pump = null;
};

let pendingSpeak: number | null = null;
/** Cada locución tiene un número; al cancelarse, la cadena vieja se descarta. */
let speakToken = 0;

/**
 * Parte el texto en frases cortas. Chrome corta las locuciones largas
 * (bug conocido de ~15 s), así que se encadenan pedazos breves.
 */
function splitForSpeech(text: string, max = 120): string[] {
  const parts = text.split(/(?<=[.:;])\s+/);
  const out: string[] = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (last && last.length + p.length + 1 <= max) out[out.length - 1] = `${last} ${p}`;
    else out.push(p);
  }
  return out.filter((s) => s.trim().length);
}

function speakSynth(text: string) {
  // Tiempo de lectura estimado, para cuando el subtítulo tiene que narrar solo.
  const estimate = Math.min(22000, 1800 + text.length * 62);
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  if (!synth) {
    emit({ voiceInfo: 'Este navegador no tiene síntesis de voz: quedan los subtítulos.' });
    endNarration(estimate, true);
    return;
  }

  const utter = () => {
    pendingSpeak = null;
    const token = ++speakToken;
    const chunks = splitForSpeech(text);
    let i = 0;
    let reallyStarted = false;

    const speakNext = () => {
      if (token !== speakToken) return; // la locución fue reemplazada
      if (i >= chunks.length) {
        stopPump();
        if (reallyStarted) endNarration();
        else {
          // Nunca arrancó: no hay voz utilizable. El subtítulo hace de narración.
          if (voicesChecked) emit({ voiceInfo: 'El navegador no pudo reproducir la voz: quedan los subtítulos.' });
          endNarration(estimate, true);
        }
        return;
      }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v?.lang ?? 'es-AR';
      u.rate = 0.95;
      u.pitch = 1;
      u.onstart = () => {
        reallyStarted = true;
        startPump();
      };
      u.onend = () => speakNext();
      u.onerror = (ev: SpeechSynthesisErrorEvent) => {
        stopPump();
        // 'canceled' e 'interrupted' los provocamos nosotros al cambiar de paso:
        // no significan que la voz no funcione y no deben desactivar nada.
        if (ev.error === 'canceled' || ev.error === 'interrupted' || token !== speakToken) return;
        emit({ voiceInfo: `El navegador no pudo reproducir la voz (${ev.error}): quedan los subtítulos.` });
        endNarration(estimate, true);
      };
      if (synth.paused) synth.resume();
      synth.speak(u);
    };

    speakNext();
  };

  // Chrome descarta la locución si `speak` va pegado a `cancel`.
  synth.cancel();
  if (pendingSpeak) window.clearTimeout(pendingSpeak);
  pendingSpeak = window.setTimeout(utter, 120);

  // Red de seguridad: si `onend` nunca llega, el subtítulo se libera igual.
  if (watchdog) window.clearTimeout(watchdog);
  watchdog = window.setTimeout(() => endNarration(), estimate + 6000);
}

/** Narra un texto. Usa el archivo propio si existe en public/audio/manifest.json. */
export function narrate(id: string, text: string) {
  // La voz sí puede hablar sobre el silencio ambiental (capítulo "El silencio").
  if (!state.ready || state.muted) return;
  stopNarration();
  emit({ subtitle: text, speaking: true });
  duck(true);
  const file = manifest[id];
  if (file) {
    narrationEl = new Audio(`${import.meta.env.BASE_URL}audio/${file}`);
    narrationEl.onended = () => endNarration();
    narrationEl.onerror = () => speakSynth(text);
    void narrationEl.play().catch(() => speakSynth(text));
  } else {
    speakSynth(text);
  }
}
