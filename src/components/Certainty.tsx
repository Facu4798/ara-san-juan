import type { Certainty } from '../data/types';
import { CERTAINTY_LABEL } from '../utils/format';
import { sourceById, sourceShort } from '../data/sources';

export function CertaintyBadge({ c }: { c: Certainty }) {
  return <span className={`badge ${c}`}>{CERTAINTY_LABEL[c]}</span>;
}

export function CertaintyLegend() {
  return (
    <div className="legend" role="list" aria-label="Codificación del nivel de certeza">
      {(['hecho', 'estimacion', 'hipotesis'] as const).map((c) => (
        <span className="legend-item" role="listitem" key={c}>
          <i className={`glyph ${c}`} aria-hidden="true" />
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
          <a key={id} className="srcref" href={`#fuente-${id}`} title={`${s.institucion} — ${s.titulo}`}>
            [{sourceShort(id)}]
          </a>
        );
      })}
    </>
  );
}
