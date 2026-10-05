import { useEffect, useMemo, useState } from 'react';
import { Intro } from './components/Intro';
import { MapChapter } from './scenes/MapChapter';
import { DescentChapter } from './scenes/DescentChapter';
import { CrewChapter } from './scenes/CrewChapter';
import { Explorer } from './components/Explorer';
import { Methodology } from './components/Methodology';
import { useGeoData } from './utils/loadData';
import { hasWebGL } from './utils/webgl';
import { AudioToggle, Subtitles } from './components/AudioControls';

const NAV = [
  { id: 'viaje', label: 'Viaje' },
  { id: 'profundidad', label: '907 m' },
  { id: 'los44', label: '44' },
  { id: 'explorar', label: 'Explorar' },
  { id: 'metodologia', label: 'Metodología' },
];

export default function App() {
  const { data: geo, error } = useGeoData();
  const webgl = useMemo(() => hasWebGL(), []);
  const [force2D, setForce2D] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [geo]);

  return (
    <>
      <nav className="topnav" aria-label="Capítulos">
        <ol>
          {NAV.map((n) => (
            <li key={n.id}>
              <a href={`#${n.id}`} aria-current={active === n.id}>{n.label}</a>
            </li>
          ))}
        </ol>
        <div className="topnav-actions">
        <AudioToggle />
        <button
          className="toggle2d"
          aria-pressed={force2D || !webgl}
          disabled={!webgl}
          onClick={() => setForce2D((v) => !v)}
          title={webgl ? 'Alternar entre escena 3D y corte 2D' : 'WebGL no disponible: se muestra la versión 2D'}
        >
          {webgl ? (force2D ? 'Versión 2D' : 'Ver en 2D') : 'Versión 2D (sin WebGL)'}
        </button>
        </div>
      </nav>
      <Subtitles />

      <main>
        <Intro />
        {error && <p className="section muted">No se pudieron cargar los datos geográficos: {error}</p>}
        <MapChapter geo={geo} />
        <DescentChapter geo={geo} use3D={webgl && !force2D} />
        <CrewChapter />
        <Explorer geo={geo} />
        <Methodology />
      </main>

      <footer>
        Proyecto para «Contar con Datos» (UdeSA). Todos los datos visualizados están referenciados en la sección de metodología.
        <br />
        En memoria de los 44 tripulantes del ARA San Juan.
      </footer>
    </>
  );
}
