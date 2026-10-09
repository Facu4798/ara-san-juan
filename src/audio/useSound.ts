import { useEffect, useRef, useSyncExternalStore } from 'react';
import { audioStore, cue, resetStory, setEnv, start } from './engine';
import { DEFAULT_ENV } from './layers';
import type { SoundScene } from '../story/beats';
import { storyStore } from '../story/store';
import { appStore } from '../app/appStore';
import { T_0719 } from '../explore/travesia/travesiaModel';
import { beats } from '../story/beats';
import { subAt } from '../journey/subPath';
import { live } from '../journey/live';
import { T } from '../journey/timeline';

export function useAudioState() {
  return useSyncExternalStore(audioStore.subscribe, audioStore.get, audioStore.get);
}

/** Momentos de la película que disparan un sonido puntual (sólo al pasar de largo en reproducción normal). */
const CUES: { t: number; cue: Parameters<typeof cue>[0] }[] = [
  { t: T.c2342 + 0.2, cue: 'radio' },
  { t: T.c0028 + 0.2, cue: 'radio' },
  { t: T.c0600 + 0.1, cue: 'tick' },
  { t: T.c0719 + 0.1, cue: 'radio' },
  { t: T.silencio + 3.2, cue: 'ping' },
  { t: T.colapso - 0.9, cue: 'dropout' },
  { t: T.colapso + 0.02, cue: 'collapse' },
  { t: T.distancia + 0.15, cue: 'bells' },
  { t: T.hallazgo + 0.3, cue: 'ping' },
];

/**
 * Director de sonido: escucha el relato y alimenta al motor con el entorno de la película.
 * No renderiza nada. También arranca el audio en el primer gesto del usuario en cualquier parte de
 * la página, para que el ambiente esté presente «en todo momento».
 */
export function useSoundDirector() {
  const lastT = useRef(0);

  useEffect(() => {
    const unlock = () => void start();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    // Exploración: el ambiente sigue al módulo (y a la profundidad o al instante elegido).
    const onExplore = () => {
      const app = appStore.get();
      if (app.mode !== 'explore') return false;
      let scene: SoundScene = 'memoria';
      let depth = 0;
      if (app.module === 'profundidad') {
        scene = 'profundo';
        depth = app.depth;
      } else if (app.module === 'travesia') {
        const t = app.travesiaT;
        scene = app.subInspect ? 'casco' : t >= T_0719 ? 'silencio' : t >= Date.parse('2017-11-14T22:00:00-03:00') ? 'casco' : 'viaje';
      } else if (app.module === 'busqueda') {
        scene = 'viaje';
      }
      setEnv({ ...DEFAULT_ENV, scene, depthM: depth, under: depth > 2 });
      return true;
    };

    const onStory = () => {
      if (onExplore()) return;
      const { index, t } = storyStore.get();
      const b = beats[index];
      const env = live.env;
      const sub = subAt(t);
      setEnv({
        scene: b.sound,
        depthM: sub.depthM,
        stress: env?.stress ?? 0,
        speedKn: sub.speedKn,
        storm: env?.storm ?? 0,
        under: live.camPos.y < -0.001,
        alert: t >= T.c0600 && t < T.c0719 + 0.2 ? 0.6 : 0,
      });

      // Sonidos puntuales: sólo si el tiempo avanzó de forma natural (no al arrastrar la barra ni saltar).
      const dt = t - lastT.current;
      if (dt > 0 && dt < 0.6) for (const c of CUES) if (lastT.current < c.t && t >= c.t) cue(c.cue);
      if (t < T.colapso - 1.2) resetStory();
      lastT.current = t;
    };
    onStory();
    const offStory = storyStore.subscribe(onStory);
    const offApp = appStore.subscribe(onStory);
    return () => {
      offStory();
      offApp();
    };
  }, []);
}
