import { useEffect, useRef, useSyncExternalStore } from 'react';
import { audioStore, cue, setDepth, setScene, start } from './engine';
import { storyStore } from '../story/store';
import { appStore } from '../app/appStore';
import { T_0719 } from '../explore/travesia/travesiaModel';
import { beats } from '../story/beats';
import { descentDepth } from '../story/descent';
import { VOYAGE_TIMING } from '../data/route';
import { WRECK_DEPTH_M } from '../data/depth';

export function useAudioState() {
  return useSyncExternalStore(audioStore.subscribe, audioStore.get, audioStore.get);
}

/**
 * Director de sonido: escucha el relato y ajusta el ambiente. No renderiza nada.
 * También arranca el audio en el primer gesto del usuario en cualquier parte de la página,
 * para que el ambiente esté presente «en todo momento».
 */
export function useSoundDirector() {
  const lastIndex = useRef(-1);
  const lastP = useRef(0);

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
    const crossed = (prev: number, now: number, at: number) => prev < at && now >= at;
    // Exploración: el ambiente sigue al módulo (y a la profundidad o al instante elegido).
    const onExplore = () => {
      const app = appStore.get();
      if (app.mode !== 'explore') return false;
      if (app.module === 'profundidad') {
        setScene('profundo');
        setDepth(app.depth);
      } else if (app.module === 'travesia') {
        const t = app.travesiaT;
        setScene(app.subInspect ? 'casco' : t >= T_0719 ? 'silencio' : t >= Date.parse('2017-11-14T22:00:00-03:00') ? 'casco' : 'mapa');
        setDepth(0);
      } else {
        setScene(app.module === 'busqueda' ? 'mapa' : 'memoria');
        setDepth(0);
      }
      return true;
    };
    const onStory = () => {
      if (onExplore()) return;
      const { index, p } = storyStore.get();
      const b = beats[index];
      const entered = index !== lastIndex.current;
      const prevP = entered ? 0 : lastP.current;
      setScene(b.sound);

      if (b.id === 'descenso') setDepth(descentDepth(p));
      else if (b.id === 'hallazgo') setDepth(WRECK_DEPTH_M);
      else setDepth(0);

      // Pings: llegada a cada lugar documentado del viaje y aparición de la coordenada.
      if (b.id === 'viaje' && (crossed(prevP, p, VOYAGE_TIMING.holdUshuaia[0]) || crossed(prevP, p, VOYAGE_TIMING.holdEnd[0]))) cue('ping');
      if (entered && (b.id === 'c0028' || b.id === 'hallazgo')) cue('ping');
      if (entered && b.id === 'c0600') cue('tick');
      if (b.id === 'implosion' && crossed(prevP, p, 0.38)) cue('swell');

      lastIndex.current = index;
      lastP.current = p;
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
