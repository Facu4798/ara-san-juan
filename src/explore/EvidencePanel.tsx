import { events } from '../data/events';
import { sourceById } from '../data/sources';
import { evidence } from '../data/evidence';
import { positionById, POS_CTBTO } from '../data/positions';
import { CertaintyBadge, SourceRefs } from '../components/Certainty';
import { setApp, useApp } from '../app/appStore';
import { fmtWhen } from './format';

/**
 * PANEL DE EVIDENCIA de un acontecimiento: qué dice la fuente, quién la emite, cuándo, el
 * fragmento relevante, documentos asociados y la clasificación de certeza (con ícono).
 * Si sólo existe una transcripción, se presenta como transcripción.
 */
const EVIDENCE_BY_EVENT: Record<string, string[]> = {
  c0600: ['sitrep-0600'],
};

export function EvidencePanel() {
  const id = useApp((s) => s.evidenceEventId);
  const e = events.find((x) => x.id === id);
  if (!e) return null;
  const pos = e.positionId ? (e.positionId === 'ctbto' ? POS_CTBTO : positionById.get(e.positionId)) : null;
  const docs = (EVIDENCE_BY_EVENT[e.id] ?? []).map((d) => evidence.find((x) => x.id === d)!).filter(Boolean);
  const quote = e.detalle.match(/«[^»]+»|"[^"]+"/g);
  return (
    <div className="evidence-panel" role="dialog" aria-label={`Evidencia: ${e.titulo}`}>
      <button type="button" className="close" onClick={() => setApp({ evidenceEventId: null })} aria-label="Cerrar">×</button>
      <div className="eyebrow">Evidencia documental</div>
      <h3>{e.titulo}</h3>
      <div className="ev-meta">
        <span>{fmtWhen(e.datetime, e.precision)}</span>
        <CertaintyBadge c={e.certainty} />
      </div>

      <section>
        <h4>Qué se sabe</h4>
        <p>{e.detalle}</p>
        {e.nota && <p className="muted">Nota: {e.nota}</p>}
      </section>

      {quote && (
        <section>
          <h4>Fragmento citado</h4>
          {quote.map((q, i) => <blockquote key={i}>{q}</blockquote>)}
          <p className="muted small">Transcripción de la fuente: no es una grabación.</p>
        </section>
      )}

      {docs.map((d) => (
        <section key={d.id} className="ev-doc">
          <h4>{d.titulo} · {d.fecha}</h4>
          {d.texto && <blockquote className="doc">«{d.texto}»</blockquote>}
          {d.nota && <p className="muted small">{d.nota}</p>}
        </section>
      ))}

      {pos && (
        <section>
          <h4>Lugar</h4>
          <p>
            {pos.label}
            {pos.textoFuente && <> · <span className="mono">{pos.textoFuente}</span></>}
          </p>
          {pos.nota && <p className="muted small">{pos.nota}</p>}
        </section>
      )}

      <section>
        <h4>Fuentes</h4>
        <ul className="ev-sources">
          {e.sourceIds.map((sid) => {
            const s = sourceById.get(sid);
            if (!s) return null;
            return (
              <li key={sid}>
                <strong>{s.institucion}</strong> · {s.fecha}
                <div><a href={s.url} target="_blank" rel="noreferrer">{s.titulo}</a>{s.archivo && <> · <a href={s.archivo} target="_blank" rel="noreferrer">copia archivada</a></>}</div>
                <div className="muted small">Limitaciones: {s.limitaciones}</div>
              </li>
            );
          })}
        </ul>
        <SourceRefs ids={e.sourceIds} />
      </section>
    </div>
  );
}
