/**
 * CAPAS DE SONIDO DEL VIAJE. Todo se sintetiza en el navegador (Web Audio): no hay grabaciones del
 * submarino, del mar ni del hecho del 15/11/2017. Es diseño sonoro, no dato, y así se declara en la
 * metodología. No hay voz.
 *
 * El motor recibe un entorno continuo (profundidad, «estrés» de puesta en escena, velocidad, temporal,
 * si la cámara está bajo el agua) y lo traduce en capas:
 *   mar · temporal · casco · hélice · retumbo profundo · sonar · crujidos · burbujas · latido · tensión
 * más eventos puntuales: radio, colapso, silencio previo y memoria (acorde y campanillas de las 44 luces).
 * Nunca llega al silencio total salvo el instante previo al colapso (dropout de 0,9 s), a propósito.
 */
import type { SoundScene } from '../story/beats';

export interface AudioEnv {
  scene: SoundScene;
  /** Profundidad del submarino (m). */
  depthM: number;
  /** 0 a 1: puesta en escena de la presión (nace en el límite preventivo de 100 m). */
  stress: number;
  /** Velocidad aparente (nudos). */
  speedKn: number;
  /** 0 a 1: mar agitado. */
  storm: number;
  /** La cámara está bajo el agua. */
  under: boolean;
  /** 0 a 1: avería (aviso de las 06:00). */
  alert: number;
}

export const DEFAULT_ENV: AudioEnv = { scene: 'mar', depthM: 0, stress: 0, speedKn: 0, storm: 0, under: false, alert: 0 };

export type Cue = 'ping' | 'tick' | 'swell' | 'radio' | 'dropout' | 'collapse' | 'memory' | 'bells';

export interface Buses {
  /** Ambiente (mar, casco, tensión…): se atenúa con el duck. */
  ambient: GainNode;
  /** Efectos puntuales (colapso, radio): no se atenúan. */
  fx: GainNode;
  /** Envío a la reverb larga. */
  reverb: GainNode;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function noise(c: BaseAudioContext, seconds: number, kind: 'white' | 'pink' | 'brown'): AudioBuffer {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w;
    else if (kind === 'pink') {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.16;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
  }
  return buf;
}

/** Respuesta al impulso de una sala grande y húmeda (ruido que decae, cada vez más grave). */
export function impulseResponse(c: BaseAudioContext, seconds = 3.4): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const k = 0.12 + 0.85 * Math.pow(t, 0.6); // filtro pasa-bajos que se cierra con el tiempo
      lp += (Math.random() * 2 - 1 - lp) * (1 - k);
      d[i] = lp * Math.pow(1 - t, 2.4) * (0.6 + 0.4 * Math.random());
    }
  }
  return buf;
}

function loopSrc(c: BaseAudioContext, buf: AudioBuffer) {
  const s = c.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.start();
  return s;
}

/** Curva de saturación suave: da peso al estruendo sin recortar de forma áspera. */
function softClip(c: BaseAudioContext, amount = 2.2) {
  const ws = c.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  ws.curve = curve;
  ws.oversample = '2x';
  return ws;
}

export class Layers {
  private c: BaseAudioContext;
  private io: Buses;
  private env: AudioEnv = { ...DEFAULT_ENV };

  // capas continuas
  private seaGain: GainNode;
  private seaFilter: BiquadFilterNode;
  private stormGain: GainNode;
  private stormFilter: BiquadFilterNode;
  private hullGain: GainNode;
  private engineGain: GainNode;
  private engineFilter: BiquadFilterNode;
  private engineLfo: OscillatorNode;
  private engineOsc: OscillatorNode[] = [];
  private deepGain: GainNode;
  private deepFilter: BiquadFilterNode;
  private padGain: GainNode;
  private padFilter: BiquadFilterNode;
  private padOsc: OscillatorNode[] = [];
  private memGain: GainNode;
  private memOsc: OscillatorNode[] = [];

  // programador de eventos
  private timer = 0;
  private lastTick = 0;
  private nextBeat = 0;
  private nextPing = 0;
  private quietUntil = 0;
  private brown: AudioBuffer;
  private white: AudioBuffer;
  private collapsed = false;

  constructor(c: BaseAudioContext, io: Buses) {
    this.c = c;
    this.io = io;
    const pink = noise(c, 6, 'pink');
    this.brown = noise(c, 6, 'brown');
    this.white = noise(c, 3, 'white');

    // Mar: ruido rosa con oleaje lento.
    this.seaGain = c.createGain();
    this.seaGain.gain.value = 0;
    this.seaFilter = c.createBiquadFilter();
    this.seaFilter.type = 'lowpass';
    this.seaFilter.frequency.value = 700;
    const swell = c.createGain();
    swell.gain.value = 0.7;
    loopSrc(c, pink).connect(this.seaFilter).connect(swell).connect(this.seaGain).connect(io.ambient);
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
    lfo2.connect(lfo2Depth).connect(this.seaFilter.frequency);
    lfo2.start();

    // Temporal: viento y rociones (ruido filtrado con ráfagas).
    this.stormGain = c.createGain();
    this.stormGain.gain.value = 0;
    this.stormFilter = c.createBiquadFilter();
    this.stormFilter.type = 'bandpass';
    this.stormFilter.frequency.value = 900;
    this.stormFilter.Q.value = 0.55;
    const gust = c.createGain();
    gust.gain.value = 0.8;
    loopSrc(c, noise(c, 5, 'pink')).connect(this.stormFilter).connect(gust).connect(this.stormGain).connect(io.ambient);
    const gl = c.createOscillator();
    gl.frequency.value = 0.21;
    const gd = c.createGain();
    gd.gain.value = 0.35;
    gl.connect(gd).connect(gust.gain);
    gl.start();

    // Casco: zumbido de máquinas y siseo de ventilación.
    this.hullGain = c.createGain();
    this.hullGain.gain.value = 0;
    this.hullGain.connect(io.ambient);
    const hullFilter = c.createBiquadFilter();
    hullFilter.type = 'lowpass';
    hullFilter.frequency.value = 420;
    hullFilter.connect(this.hullGain);
    ([[55, 'sine', 0.55], [110.4, 'triangle', 0.16], [165.3, 'sine', 0.06]] as [number, OscillatorType, number][]).forEach(([f, type, g]) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = g;
      o.connect(og).connect(hullFilter);
      o.start();
    });
    const vent = c.createBiquadFilter();
    vent.type = 'bandpass';
    vent.frequency.value = 950;
    vent.Q.value = 0.8;
    const ventGain = c.createGain();
    ventGain.gain.value = 0.2;
    loopSrc(c, pink).connect(vent).connect(ventGain).connect(hullFilter);

    // Hélice y motor eléctrico: golpe grave a la frecuencia de paso de las palas.
    this.engineGain = c.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter = c.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 700;
    this.engineFilter.Q.value = 0.9;
    const am = c.createGain();
    am.gain.value = 0.62;
    this.engineFilter.connect(am).connect(this.engineGain).connect(io.ambient);
    (
      [[41, 'triangle', 0.55], [82.5, 'sine', 0.3], [123, 'sine', 0.1]] as [number, OscillatorType, number][]
    ).forEach(([f, type, g]) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = g;
      o.connect(og).connect(this.engineFilter);
      o.start();
      this.engineOsc.push(o);
    });
    this.engineLfo = c.createOscillator();
    this.engineLfo.frequency.value = 3;
    const lfoAm = c.createGain();
    lfoAm.gain.value = 0.38;
    this.engineLfo.connect(lfoAm).connect(am.gain);
    this.engineLfo.start();

    // Retumbo profundo (ruido marrón) que se oscurece con la profundidad.
    this.deepGain = c.createGain();
    this.deepGain.gain.value = 0;
    this.deepFilter = c.createBiquadFilter();
    this.deepFilter.type = 'lowpass';
    this.deepFilter.frequency.value = 220;
    loopSrc(c, this.brown).connect(this.deepFilter).connect(this.deepGain).connect(io.ambient);

    // Tensión: tres sierras desafinadas que suben con el estrés (el «riser» del descenso).
    this.padGain = c.createGain();
    this.padGain.gain.value = 0;
    this.padFilter = c.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 200;
    this.padFilter.Q.value = 3;
    this.padFilter.connect(this.padGain).connect(io.ambient);
    [55, 55.7, 82.9].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = i === 2 ? 0.25 : 0.4;
      o.connect(og).connect(this.padFilter);
      o.start();
      this.padOsc.push(o);
    });

    // Memoria: acorde abierto muy suave (re, la, re, fa♯) que entra durante el ascenso de las 44 luces.
    this.memGain = c.createGain();
    this.memGain.gain.value = 0;
    this.memGain.connect(io.ambient);
    this.memGain.connect(io.reverb);
    [146.83, 220, 293.66, 369.99].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = i === 3 ? 0.12 : 0.22;
      o.connect(og).connect(this.memGain);
      o.start();
      this.memOsc.push(o);
    });

    this.lastTick = c.currentTime;
    this.nextBeat = c.currentTime + 1;
    this.nextPing = c.currentTime + 3;
    this.timer = window.setInterval(() => this.tick(), 90);
  }

  dispose() {
    clearInterval(this.timer);
  }

  /** Aplica el entorno: lleva cada capa a su nivel con transiciones suaves. */
  setEnv(e: AudioEnv, tc = 0.35) {
    this.env = e;
    const c = this.c;
    const now = c.currentTime;
    const s = e.scene;
    const post = s === 'colapso' || s === 'fondo' || s === 'memoria';
    const k = clamp(e.depthM / 907);
    const under = e.under;

    // Mar y temporal (encima del agua).
    const seaTarget = under ? 0.05 : post ? 0.42 : lerp(s === 'mar' ? 0.5 : 0.3, 0.45, e.storm);
    this.seaGain.gain.setTargetAtTime(seaTarget, now, tc * 2);
    this.seaFilter.frequency.setTargetAtTime(under ? 360 : 750 + 350 * e.storm, now, tc * 2);
    this.stormGain.gain.setTargetAtTime(under ? 0 : 0.34 * e.storm, now, tc * 2);
    this.stormFilter.frequency.setTargetAtTime(700 + 900 * e.storm, now, tc * 3);

    // Casco: sólo mientras hay máquinas o una avería informada.
    const alive = s === 'viaje' || s === 'tormenta' || s === 'casco' || (s === 'profundo' && !this.collapsed);
    this.hullGain.gain.setTargetAtTime(alive ? 0.08 + 0.3 * e.alert + (s === 'casco' ? 0.2 : 0) : 0, now, tc * 2);

    // Hélice: sigue la velocidad; bajo el agua se amortigua y se oye «por el casco».
    const v = clamp(e.speedKn / 9);
    const engineOn = alive && !this.collapsed ? v : 0;
    this.engineGain.gain.setTargetAtTime(engineOn * (under ? 0.5 : 0.34), now, tc * 2);
    this.engineFilter.frequency.setTargetAtTime(under ? 240 : 700, now, tc * 2);
    this.engineLfo.frequency.setTargetAtTime(1.4 + 4.2 * v, now, tc * 2);
    this.engineOsc.forEach((o, i) => o.frequency.setTargetAtTime([41, 82.5, 123][i] * (0.9 + 0.2 * v), now, tc * 2));

    // Retumbo profundo.
    const deep = s === 'colapso' ? 0.1 : s === 'fondo' ? 0.08 : post ? 0.05 : 0.04 + 0.34 * k + 0.1 * e.stress;
    this.deepGain.gain.setTargetAtTime(deep, now, tc * 2);
    this.deepFilter.frequency.setTargetAtTime(s === 'fondo' || s === 'colapso' ? 110 : 220 - 110 * k, now, tc * 2);

    // Tensión ascendente.
    const st = this.collapsed ? 0 : e.stress;
    this.padGain.gain.setTargetAtTime(Math.pow(st, 1.5) * 0.2, now, tc * 1.5);
    this.padFilter.frequency.setTargetAtTime(160 + 1500 * st * st, now, tc * 1.5);
    this.padOsc.forEach((o, i) => o.frequency.setTargetAtTime([55, 55.7, 82.9][i] * (1 + 0.14 * st), now, tc * 1.5));

    // Memoria.
    this.memGain.gain.setTargetAtTime(s === 'memoria' ? 0.045 : 0, now, s === 'memoria' ? 2.4 : 1.2);
  }

  /** Bajada breve de todo el ambiente (silencio previo al colapso, retorno lento). */
  duck(to: number, attack: number, hold: number, release: number) {
    const g = this.io.ambient.gain;
    const now = this.c.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(to, now + attack);
    g.setValueAtTime(to, now + attack + hold);
    g.linearRampToValueAtTime(1, now + attack + hold + release);
  }

  // ——— programador: eventos aleatorios y rítmicos ———
  private tick() {
    const c = this.c;
    if (c.state !== 'running') return;
    const now = c.currentTime;
    const dt = Math.min(0.5, now - this.lastTick);
    this.lastTick = now;
    const e = this.env;
    if (now < this.quietUntil) return;
    const under = e.under || e.depthM > 3;

    // Crujidos del casco: nacen en el límite preventivo y se aceleran con el estrés.
    if (e.stress > 0.02 && !this.collapsed && Math.random() < dt * 3.4 * Math.pow(e.stress, 1.2)) this.creak(e.stress);

    // Latido: acelera con el estrés.
    if (e.stress > 0.22 && !this.collapsed && now >= this.nextBeat) {
      this.heartbeat(0.05 + 0.12 * e.stress);
      this.nextBeat = now + 60 / (58 + 54 * e.stress);
    }

    // Sonar: bajo el agua, cada vez más seguido; no suena en el silencio ni tras el colapso.
    const sonarOn = under && !this.collapsed && e.scene !== 'silencio' && e.scene !== 'fondo' && e.scene !== 'colapso' && e.scene !== 'memoria';
    if (sonarOn && now >= this.nextPing) {
      this.ping(0.04 + 0.03 * e.stress);
      this.nextPing = now + rand(6.5, 9) - 4 * e.stress;
    }

    // Burbujas: sólo con el submarino sumergido y en movimiento.
    if (under && e.speedKn > 0.5 && !this.collapsed && Math.random() < dt * (0.9 + 2.2 * e.stress)) this.bubble();
  }

  private pan(v: number) {
    const p = this.c.createStereoPanner();
    p.pan.value = v;
    return p;
  }

  private env2(g: GainNode, t0: number, peak: number, attack: number, release: number) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + release);
  }

  /** Crujido de un casco que cede: resonancia metálica con glissando y un clic seco. */
  private creak(stress: number) {
    const c = this.c;
    const t = c.currentTime + 0.01;
    const dur = rand(0.25, 0.9) * (1.2 - 0.5 * stress);
    const o = c.createOscillator();
    o.type = 'sawtooth';
    const f0 = rand(70, 150);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * rand(0.55, 1.8), t + dur);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = rand(170, 460);
    bp.Q.value = rand(7, 16);
    const g = c.createGain();
    this.env2(g, t, rand(0.05, 0.1) * (0.45 + stress), dur * 0.3, dur * 0.7);
    const p = this.pan(rand(-0.9, 0.9));
    o.connect(bp).connect(g).connect(p).connect(this.io.fx);
    p.connect(this.io.reverb);
    o.start(t);
    o.stop(t + dur + 0.1);
    // clic seco al inicio
    const n = c.createBufferSource();
    n.buffer = this.white;
    const hp = c.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = rand(900, 2600);
    hp.Q.value = 2;
    const ng = c.createGain();
    this.env2(ng, t, rand(0.02, 0.05), 0.002, 0.05);
    n.connect(hp).connect(ng).connect(p);
    n.start(t, Math.random() * 2);
    n.stop(t + 0.08);
    // a mayor presión, un tañido metálico inarmónico
    if (stress > 0.5 && Math.random() < 0.45) {
      const car = c.createOscillator();
      const mod = c.createOscillator();
      const md = c.createGain();
      car.frequency.value = rand(430, 900);
      mod.frequency.value = car.frequency.value * 1.41;
      md.gain.value = 90;
      mod.connect(md).connect(car.frequency);
      const tg = c.createGain();
      this.env2(tg, t + 0.05, 0.02 * stress, 0.004, 0.5);
      car.connect(tg).connect(p);
      car.start(t + 0.05);
      mod.start(t + 0.05);
      car.stop(t + 0.7);
      mod.stop(t + 0.7);
    }
  }

  private heartbeat(level: number) {
    const c = this.c;
    const t = c.currentTime + 0.01;
    for (const [dt, f, g] of [[0, 62, 1], [0.2, 52, 0.7]] as [number, number, number][]) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f * 1.6, t + dt);
      o.frequency.exponentialRampToValueAtTime(f, t + dt + 0.09);
      const gg = c.createGain();
      this.env2(gg, t + dt, level * g, 0.008, 0.22);
      o.connect(gg).connect(this.io.fx);
      o.start(t + dt);
      o.stop(t + dt + 0.3);
    }
  }

  /** Eco de sonar lejano. */
  ping(level = 0.045) {
    const c = this.c;
    const t = c.currentTime + 0.01;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1180, t);
    o.frequency.exponentialRampToValueAtTime(940, t + 0.6);
    const g = c.createGain();
    this.env2(g, t, level, 0.015, 1.5);
    const p = this.pan(rand(-0.5, 0.5));
    o.connect(g).connect(p).connect(this.io.fx);
    p.connect(this.io.reverb);
    o.start(t);
    o.stop(t + 1.7);
  }

  private bubble() {
    const c = this.c;
    const t = c.currentTime + 0.01;
    const o = c.createOscillator();
    o.type = 'sine';
    const f = rand(320, 1400);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.07);
    const g = c.createGain();
    this.env2(g, t, rand(0.008, 0.02), 0.004, 0.08);
    const p = this.pan(rand(-0.8, 0.8));
    o.connect(g).connect(p).connect(this.io.fx);
    o.start(t);
    o.stop(t + 0.14);
  }

  /** Llamada por radio / teléfono satelital: chasquido de portadora y dos pitidos. */
  private radio() {
    const c = this.c;
    const t = c.currentTime + 0.02;
    const n = c.createBufferSource();
    n.buffer = this.white;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1700;
    bp.Q.value = 1.1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.02);
    g.gain.setValueAtTime(0.05, t + 0.28);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    n.connect(bp).connect(g).connect(this.io.fx);
    n.start(t, Math.random() * 2);
    n.stop(t + 0.45);
    [0.0, 0.14].forEach((d) => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = 1180;
      const og = c.createGain();
      this.env2(og, t + 0.46 + d, 0.03, 0.004, 0.07);
      o.connect(og).connect(this.io.fx);
      o.start(t + 0.46 + d);
      o.stop(t + 0.7 + d);
    });
  }

  /** Teletipo: aparece un documento. */
  private teletype() {
    const c = this.c;
    const t = c.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = 1650;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2400;
      const g = c.createGain();
      const t0 = t + i * 0.09;
      this.env2(g, t0, 0.01, 0.003, 0.04);
      o.connect(f).connect(g).connect(this.io.fx);
      o.start(t0);
      o.stop(t0 + 0.06);
    }
  }

  /** Ola de presión lenta y grave (no es un estruendo). */
  private swell() {
    const c = this.c;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(42, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 3);
    const g = c.createGain();
    this.env2(g, t, 0.16, 0.9, 2.8);
    o.connect(g).connect(this.io.fx);
    o.start(t);
    o.stop(t + 4);
  }

  /**
   * EL COLAPSO. Crujido seco, golpe grave con barrido descendente, retumbo que se apaga, cola de
   * reverb larga y un acúfeno tenue. Después, silencio y el ambiente vuelve de a poco.
   */
  collapse() {
    const c = this.c;
    this.collapsed = true;
    const t = c.currentTime + 0.02;
    const out = this.io.fx;
    const rev = this.io.reverb;
    // El ambiente se va casi por completo y vuelve lento.
    this.duck(0.03, 0.03, 1.6, 7.5);
    this.quietUntil = t + 1.6;

    // 1) crujido seco (agua + metal)
    const crack = c.createBufferSource();
    crack.buffer = this.white;
    const chp = c.createBiquadFilter();
    chp.type = 'highpass';
    chp.frequency.value = 900;
    const clp = c.createBiquadFilter();
    clp.type = 'lowpass';
    clp.frequency.setValueAtTime(9000, t);
    clp.frequency.exponentialRampToValueAtTime(900, t + 0.5);
    const cg = c.createGain();
    cg.gain.setValueAtTime(0.0001, t);
    cg.gain.linearRampToValueAtTime(0.9, t + 0.004);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    crack.connect(chp).connect(clp).connect(cg).connect(out);
    cg.connect(rev);
    crack.start(t, 0);
    crack.stop(t + 0.6);

    // 2) golpe grave con barrido (saturado para darle peso)
    const sc = softClip(c, 2.6);
    sc.connect(out);
    sc.connect(rev);
    [[98, 17, 2.4, 0.95], [54, 13, 3.4, 0.7]].forEach(([f0, f1, d, a]) => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + d);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(a, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(sc);
      o.start(t);
      o.stop(t + d + 0.1);
    });

    // 3) retumbo de ruido marrón con pasa-bajos que baja
    const rb = c.createBufferSource();
    rb.buffer = this.brown;
    rb.loop = true;
    const rl = c.createBiquadFilter();
    rl.type = 'lowpass';
    rl.frequency.setValueAtTime(950, t);
    rl.frequency.exponentialRampToValueAtTime(60, t + 3.8);
    const rg = c.createGain();
    rg.gain.setValueAtTime(0.0001, t);
    rg.gain.linearRampToValueAtTime(0.85, t + 0.05);
    rg.gain.exponentialRampToValueAtTime(0.0001, t + 4.4);
    rb.connect(rl).connect(rg).connect(out);
    rg.connect(rev);
    rb.start(t);
    rb.stop(t + 4.6);

    // 4) dos rebotes de la onda de presión
    [0.55, 1.15].forEach((d, i) => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(46 - 8 * i, t + d);
      o.frequency.exponentialRampToValueAtTime(20, t + d + 0.5);
      const g = c.createGain();
      this.env2(g, t + d, 0.36 / (i + 1), 0.01, 0.55);
      o.connect(g).connect(out);
      o.start(t + d);
      o.stop(t + d + 0.7);
    });

    // 5) acúfeno: un tono agudo muy tenue que se disuelve
    [3150, 3182].forEach((f) => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t + 0.1);
      g.gain.linearRampToValueAtTime(0.011, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
      o.connect(g).connect(out);
      o.start(t + 0.1);
      o.stop(t + 4.4);
    });
  }

  /** Las 44 campanillas: una por persona, muy bajas, escalonadas durante el ascenso (escala pentatónica de re). */
  bells(durationS = 5.2) {
    const c = this.c;
    const scale = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51];
    const t0 = c.currentTime + 0.1;
    for (let i = 0; i < 44; i++) {
      const t = t0 + (i / 44) * durationS + rand(0, 0.08);
      const f = scale[(i * 3 + (i >> 2)) % scale.length] * (i % 5 === 0 ? 0.5 : 1);
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const o2 = c.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = f * 2.76;
      const g = c.createGain();
      this.env2(g, t, rand(0.006, 0.014), 0.004, rand(1.8, 3.2));
      const g2 = c.createGain();
      this.env2(g2, t, 0.003, 0.003, 0.6);
      const p = this.pan(rand(-0.9, 0.9));
      o.connect(g).connect(p);
      o2.connect(g2).connect(p);
      p.connect(this.io.fx);
      p.connect(this.io.reverb);
      o.start(t);
      o2.start(t);
      o.stop(t + 3.4);
      o2.stop(t + 0.8);
    }
  }

  cue(name: Cue) {
    switch (name) {
      case 'ping':
        this.ping(0.045);
        break;
      case 'tick':
        this.teletype();
        break;
      case 'swell':
        this.swell();
        break;
      case 'radio':
        this.radio();
        break;
      case 'dropout':
        // Silencio previo: se corta el ambiente y los crujidos un instante antes del colapso.
        this.duck(0.04, 0.12, 0.7, 0.05);
        this.quietUntil = this.c.currentTime + 0.95;
        break;
      case 'collapse':
        this.collapse();
        break;
      case 'memory':
        this.collapsed = true;
        break;
      case 'bells':
        this.bells();
        break;
    }
  }

  /** Reinicia el estado de la película (al volver antes del colapso). */
  reset() {
    this.collapsed = false;
    this.quietUntil = 0;
  }
}
