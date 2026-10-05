import { useEffect, useRef, useSyncExternalStore } from 'react';
import { audioStore, narrate, effect, setDepth, silenceAll, resumeAmbient, type EffectName } from './engine';
import { narrationScript } from './narration';

export function useAudioState() {
  return useSyncExternalStore(audioStore.subscribe, audioStore.get, audioStore.get);
}

/**
 * Narra el paso activo una sola vez, cuando se mantuvo estable un momento
 * (si alguien scrollea rápido, no se encadenan locuciones).
 */
export function useStepNarration(key: string | null, delay = 650) {
  const spoken = useRef<string | null>(null);
  const { ready, muted } = useAudioState();
  useEffect(() => {
    if (!ready || muted || !key || spoken.current === key) return;
    const t = window.setTimeout(() => {
      const text = narrationScript[key];
      if (text) {
        spoken.current = key;
        narrate(key, text);
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [key, ready, muted, delay]);
}

/** Narra la línea del guion asociada a una clave. */
export function narrateKey(key: string) {
  const text = narrationScript[key];
  if (text) narrate(key, text);
}

export { narrate, effect, setDepth, silenceAll, resumeAmbient };
export type { EffectName };
