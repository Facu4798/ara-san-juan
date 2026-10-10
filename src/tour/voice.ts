import { useSyncExternalStore } from 'react';
import { getAudioContext, playVoice, stopVoice } from '../audio/engine';
import voz from './voz.json';

/**
 * NARRACIÓN DEL TOUR. Voz masculina argentina sintetizada con IA (Microsoft Edge TTS, es-AR-TomasNeural),
 * generada una sola vez con scripts/build_voz.py y servida como archivos MP3 estáticos: no hay llamadas a
 * ningún servicio al abrir la página. No es una persona real ni una grabación.
 *
 * Los clips se descargan en segundo plano (a la espera de que alguien mire el tour) y se decodifican al
 * empezar, ya con el contexto de audio creado por el clic del usuario.
 */
const url = (id: string) => `${import.meta.env.BASE_URL}tour/voz/${id}.mp3`;

const raw = new Map<string, ArrayBuffer>();
const pending = new Map<string, Promise<void>>();
const decoded = new Map<string, AudioBuffer>();

/** Descarga los MP3 (unos 350 KB en total) al caché del navegador. Se puede llamar varias veces. */
export function preloadVoiceFiles() {
  for (const c of voz.clips) {
    if (raw.has(c.id) || pending.has(c.id)) continue;
    pending.set(
      c.id,
      fetch(url(c.id))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((b) => {
          raw.set(c.id, b);
        })
        .catch(() => {
          pending.delete(c.id); // sin voz para ese clip: el tour sigue con subtítulos
        }),
    );
  }
}

/** Decodifica los clips ya descargados con el contexto de audio vigente. */
export async function decodeVoice() {
  const ctx = getAudioContext();
  if (!ctx) return;
  preloadVoiceFiles();
  await Promise.all([...pending.values()]);
  await Promise.all(
    voz.clips.map(async (c) => {
      const b = raw.get(c.id);
      if (!b || decoded.has(c.id)) return;
      try {
        decoded.set(c.id, await ctx.decodeAudioData(b.slice(0)));
      } catch {
        /* clip dañado: se omite */
      }
    }),
  );
}

/** Reproduce un clip si la voz está activada y ya está decodificado. Devuelve si sonó. */
export function speak(id: string): boolean {
  if (!voiceOn) return false;
  const buf = decoded.get(id);
  if (!buf) return false;
  playVoice(buf);
  return true;
}

export const stopSpeaking = stopVoice;

// ——— Voz activada o no (se recuerda en el navegador) ———
const KEY = 'ara.tour.voz';
let voiceOn = (() => {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
})();
const listeners = new Set<() => void>();

export function setVoiceOn(on: boolean) {
  voiceOn = on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* sin almacenamiento: no se recuerda */
  }
  if (!on) stopVoice();
  listeners.forEach((l) => l());
}

export function useVoiceOn() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => voiceOn,
    () => voiceOn,
  );
}

/** Para los comprobadores y las pruebas: clips que ya están listos para sonar. */
export const voiceReady = () => decoded.size;
export const VOICE_COUNT = voz.clips.length;
