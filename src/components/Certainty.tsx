import type { Certainty } from '../data/types';
import { CERTAINTY_LABEL, CERTAINTY_ICON } from '../utils/format';
import { sourceById, sourceShort } from '../data/sources';
import { appStore, setApp } from '../app/appStore';

export function CertaintyBadge({ c }: { c: Certainty }) {
  return (
    <span className={`badge ${c}`}>
      <span aria-hidden="true">{CERTAINTY_ICON[c]}</span> {CERTAINTY_LABEL[c]}
    </span>
  );
}

export function CertaintyLegend() {
  return (
    <div className="legend" role="list" aria-label="Codificación del nivel de certeza">
      {(['hecho', 'estimacion', 'hipotesis', 'desconocido'] as const).map((c) => (
        <span className="legend-item" role="listitem" key={c}>
          <i className={`glyph ${c}`} aria-hidden="true">{CERTAINTY_ICON[c]}</i>
          {CERTAINTY_LABEL[c]}
        </span>
      ))}
    </div>
  );
}

/** Referencias numeradas a la tabla de fuentes. */
export function SourceRefs({ ids }: { ids: string[] }) {
  return (
    <>
      {ids.map((id) => {
        const s = sourceById.get(id);
        if (!s) return null;
        return (
          <a
            key={id}
            className="srcref"
            href={`#fuente-${id}`}
            title={`${s.institucion} — ${s.titulo}`}
            onClick={(e) => {
              // En exploración la metodología se abre como panel; se lleva la vista a la fuente.
              if (appStore.get().mode !== 'explore') return;
              e.preventDefault();
              setApp({ methodologyOpen: true });
              window.setTimeout(() => document.getElementById(`fuente-${id}`)?.scrollIntoView({ block: 'center' }), 80);
            }}
          >
            [{sourceShort(id)}]
          </a>
        );
      })}
    </>
  );
}
