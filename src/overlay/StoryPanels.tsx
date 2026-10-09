import { useEffect } from 'react';
import { setApp, useApp } from '../app/appStore';
import { EvidencePanel } from '../explore/EvidencePanel';
import { SUB_PARTS, UNPLACED } from '../explore/travesia/subParts';
import { CertaintyBadge, SourceRefs } from '../components/Certainty';

/**
 * Paneles de la historia guiada que se abren desde la escena: la evidencia de un lugar documentado
 * y la ficha de una parte del submarino. Reutilizan los de la exploración (mismos datos, fuentes y
 * certeza). Esc los cierra.
 */
export function StoryPanels() {
  const evidenceId = useApp((s) => s.evidenceEventId);
  const part = useApp((s) => s.selectedPart);

  useEffect(() => {
    if (!evidenceId && !part) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setApp(part ? { selectedPart: null } : { evidenceEventId: null });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [evidenceId, part]);

  const p = SUB_PARTS.find((x) => x.id === part);
  return (
    <div className="story-panels">
      {evidenceId && <EvidencePanel />}
      {p && (
        <div className="evidence-panel part-card" role="dialog" aria-label={p.nombre}>
          <button type="button" className="close" onClick={() => setApp({ selectedPart: null })} aria-label="Cerrar">×</button>
          <div className="eyebrow">Parte del submarino · modelo esquemático</div>
          <h3>{p.nombre}</h3>
          {p.datos.map((d, i) => (
            <section key={i}>
              <p>{d.texto}</p>
              <div className="ev-meta">
                <CertaintyBadge c={d.certainty} />
                <SourceRefs ids={d.sourceIds} />
              </div>
            </section>
          ))}
          <h4>Sin ubicación publicada (no se dibujan)</h4>
          <ul className="ev-sources">
            {UNPLACED.map((u) => (
              <li key={u.nombre}>
                <strong>{u.nombre}</strong>
                <div className="muted small">{u.texto} <SourceRefs ids={u.sourceIds} /></div>
              </li>
            ))}
          </ul>
          <p className="muted small">Sólo la eslora (65,93 m) y el ancho del casco resistente (7 m) son datos del modelo; la vela, los timones y la hélice son formas genéricas.</p>
        </div>
      )}
    </div>
  );
}
