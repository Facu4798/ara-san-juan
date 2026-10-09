import { useEffect, useState } from 'react';
import type { Beat } from '../story/beats';
import { evidenceForBeat, type AudioEvidence } from '../data/evidence';
import { CertaintyBadge, SourceRefs } from '../components/Certainty';
import { playEvidence, stopEvidence } from '../audio/engine';
import { useAudioState } from '../audio/useSound';

/**
 * Tarjeta de texto de cada momento. Las líneas aparecen de a una según el avance
 * (capas de información progresivas) y la tarjeta muestra siempre su nivel de certeza
 * y sus fuentes.
 */
export function BeatCard({ beat, p }: { beat: Beat; p: number }) {
  const ev = evidenceForBeat(beat.id);
  return (
    <article key={beat.id} className={`beat-card${beat.tone === 'alerta' ? ' alerta' : ''}`} aria-live="polite">
      <div className="eyebrow">{beat.eyebrow}</div>
      <h2>{beat.title}</h2>
      {beat.big && <div className="big">{beat.big}</div>}
      {beat.lines.map((l, i) => (
        <p key={i} className={`line${(l.from ?? 0) <= p ? ' on' : ''}`}>{l.text}</p>
      ))}
      {ev.map((e) =>
        e.tipo === 'imagen' ? (
          <figure key={e.id} className="evidence-img">
            <img src={`${import.meta.env.BASE_URL}${e.archivo}`} alt={e.titulo} />
            <figcaption>
              {e.titulo} · {e.fecha}
              <br />
              <span className="muted">{e.credito}</span> <SourceRefs ids={e.sourceIds} />
            </figcaption>
          </figure>
        ) : (
          <blockquote key={e.id} className="evidence-doc">
            <div className="doc-head">
              <span>{e.titulo}</span>
              <span>{e.fecha}</span>
            </div>
            <p>«{e.texto}»</p>
            <footer>
              {e.nota} <SourceRefs ids={e.sourceIds} />
            </footer>
          </blockquote>
        ),
      )}
      <AudioSlot beatId={beat.id} />
      <div className="meta">
        {beat.certainty.map((c) => (
          <CertaintyBadge key={c} c={c} />
        ))}
        <SourceRefs ids={beat.sourceIds} />
      </div>
      {beat.note && <p className="note">{beat.note}</p>}
    </article>
  );
}

let manifestPromise: Promise<AudioEvidence[]> | null = null;
const loadManifest = () =>
  (manifestPromise ??= fetch(`${import.meta.env.BASE_URL}evidencia/evidencia.json`)
    .then((r) => (r.ok ? r.json() : { audio: [] }))
    .then((j: { audio?: AudioEvidence[] }) => j.audio ?? [])
    .catch(() => []));

/**
 * Lugar preparado para evidencia sonora: aparece sólo si public/evidencia/evidencia.json
 * declara un audio para este momento. Se escucha con un clic y el ambiente baja mientras suena.
 */
function AudioSlot({ beatId }: { beatId: string }) {
  const [item, setItem] = useState<AudioEvidence | null>(null);
  const { evidencePlaying, ready } = useAudioState();
  useEffect(() => {
    let alive = true;
    void loadManifest().then((list) => alive && setItem(list.find((a) => a.beatId === beatId) ?? null));
    return () => {
      alive = false;
      stopEvidence();
    };
  }, [beatId]);
  if (!item) return null;
  return (
    <div className="audio-slot">
      <button
        type="button"
        className="btn-ghost small"
        disabled={!ready}
        onClick={() => (evidencePlaying ? stopEvidence() : playEvidence(`${import.meta.env.BASE_URL}evidencia/${item.archivo}`))}
      >
        {evidencePlaying ? '■ Detener' : '▶ Escuchar'} · {item.titulo}
      </button>
      <div className="muted">
        {item.fecha} · <a href={item.fuente} target="_blank" rel="noreferrer">fuente</a>
        {item.licencia && ` · ${item.licencia}`}
      </div>
      {item.transcripcion && <p className="transcript">«{item.transcripcion}»</p>}
    </div>
  );
}
