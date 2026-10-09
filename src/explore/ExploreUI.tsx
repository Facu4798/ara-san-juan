import { useEffect, useState } from 'react';
import { MODULES, appStore, openModule, resetView, setApp, useApp } from '../app/appStore';
import { CertaintyLegend } from '../components/Certainty';
import { Methodology } from '../components/Methodology';
import { EvidencePanel } from './EvidencePanel';
import { ViewScale } from './ViewScale';
import { VidasFilters, VidasResults } from './vidas/VidasPanels';
import { TravesiaDetail, TravesiaLayers, TravesiaTimeline, SubInspectorPanel, SubPartDetail } from './travesia/TravesiaPanels';
import { BusquedaControls, BusquedaDetail, BusquedaTimeline } from './busqueda/BusquedaPanels';
import { DepthControl, DepthInfo } from './profundidad/ProfundidadPanels';

/**
 * INTERFAZ DE EXPLORACIÓN: la escena 3D es protagonista; a los costados, paneles plegables
 * (controles y filtros a la izquierda, resultados y fichas a la derecha) y, donde corresponde,
 * una línea de tiempo abajo.
 */
export function ExploreUI({ status }: { status: 'ok' | 'loading' | 'no-webgl' | 'error' }) {
  const module = useApp((s) => s.module);
  const panelOpen = useApp((s) => s.panelOpen);
  const subInspect = useApp((s) => s.subInspect);
  const evidence = useApp((s) => s.evidenceEventId);
  const methodology = useApp((s) => s.methodologyOpen);
  const title = MODULES.find((m) => m.id === module)!;
  // En celulares el panel derecho se pliega y se abre con un botón.
  const [rightOpen, setRightOpen] = useState(false);

  // Teclado: Esc cierra el panel abierto más reciente; 1 a 4 cambian de módulo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = appStore.get();
      if (e.key === 'Escape') {
        if (s.methodologyOpen) setApp({ methodologyOpen: false });
        else if (s.evidenceEventId) setApp({ evidenceEventId: null });
        else if (s.selectedPart) setApp({ selectedPart: null });
        else if (s.subInspect) setApp({ subInspect: false });
        else if (s.selectedCrew != null) setApp({ selectedCrew: null });
        else if (s.selectedPlace) setApp({ selectedPlace: null });
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= MODULES.length) {
        e.preventDefault();
        openModule(MODULES[n - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const left =
    module === 'vidas' ? <VidasFilters /> :
    module === 'travesia' ? (subInspect ? <SubInspectorPanel /> : <TravesiaLayers />) :
    module === 'busqueda' ? <BusquedaControls /> :
    <DepthInfo />;
  const right =
    module === 'vidas' ? <VidasResults /> :
    module === 'travesia' ? (subInspect ? <SubPartDetail /> : <TravesiaDetail />) :
    module === 'busqueda' ? <BusquedaDetail /> :
    null;

  return (
    <div className={`explore module-${module}${subInspect ? ' sub-inspect' : ''}${panelOpen ? '' : ' panel-closed'}${rightOpen ? ' right-open' : ''}`}>
      <aside className="xpanel left" aria-label={`Controles: ${title.label}`}>{left}</aside>
      <button type="button" className="panel-toggle" onClick={() => setApp({ panelOpen: !panelOpen })} aria-expanded={panelOpen}>
        {panelOpen ? '◀ ocultar panel' : '▶ panel'}
      </button>
      {right && <aside className="xpanel right" aria-label="Resultados y fichas">{right}</aside>}
      {right && (
        <button type="button" className="right-toggle" onClick={() => setRightOpen(!rightOpen)} aria-expanded={rightOpen}>
          {rightOpen ? '× cerrar' : module === 'vidas' ? 'Resultados y fichas' : 'Detalle'}
        </button>
      )}
      {module === 'profundidad' && <DepthControl />}
      {module === 'travesia' && !subInspect && <TravesiaTimeline />}
      {module === 'busqueda' && <BusquedaTimeline />}

      <div className="xtools">
        <button type="button" className="btn-ghost small" onClick={resetView}>Restablecer vista</button>
        <CertaintyLegend />
      </div>
      <ViewScale />
      {status !== 'ok' && (
        <p className="status">
          {status === 'loading' ? 'Cargando relieve y límites…' : status === 'no-webgl' ? 'Este navegador no tiene WebGL: la escena 3D no puede mostrarse.' : 'No se pudieron cargar los datos geográficos.'}
        </p>
      )}

      {evidence && <EvidencePanel />}
      {methodology && (
        <div className="drawer" role="dialog" aria-label="Fuentes y metodología">
          <button type="button" className="close" onClick={() => setApp({ methodologyOpen: false })} aria-label="Cerrar">×</button>
          <Methodology />
        </div>
      )}
    </div>
  );
}

