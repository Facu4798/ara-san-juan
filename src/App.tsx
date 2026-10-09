import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Overlay } from './overlay/Overlay';
import { Methodology } from './components/Methodology';
import { useGeoData, useExploreData } from './utils/loadData';
import { hasWebGL } from './utils/webgl';
import { installStoryDriver, storyHeightVh, stop as stopStory } from './story/store';
import { useSoundDirector } from './audio/useSound';
import { useApp } from './app/appStore';
import { TopBar } from './app/TopBar';
import { ExploreUI } from './explore/ExploreUI';

/** La escena 3D (three.js) se descarga aparte, mientras se ve la portada. */
const Stage = lazy(() => import('./three/Stage'));

/**
 * ESTRUCTURA DE LA PÁGINA
 *   TopBar    título, historia guiada ↔ exploración, módulos, fuentes y sonido.
 *   .stage    Canvas 3D fijo a pantalla completa (un solo contexto WebGL), compartido por ambos modos.
 *   Historia guiada: Overlay + #story (su scroll mueve el relato, ~66 s en modo exposición) + anexo.
 *   Exploración: ExploreUI (paneles, filtros, líneas de tiempo) sobre la escena; sin scroll de página.
 */
export default function App() {
  const { data: geo, error } = useGeoData();
  const webgl = useMemo(() => hasWebGL(), []);
  const mode = useApp((s) => s.mode);
  const explore = useExploreData(mode === 'explore');
  const storyScroll = useRef(0);

  useEffect(() => installStoryDriver(), []);
  useSoundDirector();

  // Al pasar de un modo a otro se conserva la posición de la historia guiada.
  useLayoutEffect(() => {
    document.body.classList.toggle('explore-mode', mode === 'explore');
    if (mode === 'explore') {
      stopStory();
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    } else {
      window.scrollTo({ top: storyScroll.current, behavior: 'instant' as ScrollBehavior });
    }
  }, [mode]);
  useEffect(() => {
    if (mode !== 'story') return;
    const onScroll = () => {
      if (!document.body.classList.contains('explore-mode')) storyScroll.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mode]);

  const status = !webgl ? 'no-webgl' : error ? 'error' : geo && (mode === 'story' || explore) ? 'ok' : 'loading';

  return (
    <>
      <TopBar />
      <div className="stage">
        {webgl && geo && (
          <Suspense fallback={null}>
            <Stage geo={geo} explore={explore} />
          </Suspense>
        )}
      </div>
      {mode === 'story' ? (
        <>
          <Overlay status={status} />
          <main>
            <div id="story" style={{ height: `${storyHeightVh}vh` }} aria-hidden="true" />
            <Methodology />
          </main>
          <footer className="site-footer">
            Proyecto para «Contar con Datos» (Universidad de San Andrés). Cada dato está referenciado en la metodología.
            <br />
            En memoria de los 44 tripulantes del ARA San Juan.
          </footer>
        </>
      ) : (
        <ExploreUI status={status} />
      )}
    </>
  );
}
