import { useRef, useState } from 'react';
import { ACTS, beats, TOTAL_SECONDS } from '../story/beats';
import { flyTo, next, prev, seekNow, shareUrl, stop, togglePlay, useStory } from '../story/store';
import { HITOS, hitoAt } from '../journey/timeline';
import { start } from '../audio/engine';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Barra del presentador: reproducir el minuto completo, avanzar o retroceder un momento y una línea
 * de tiempo CONTINUA con los hitos documentados. Se arrastra (la escena entera responde en vivo: cámara,
 * submarino, clima y sonido), y un clic en un hito viaja hasta él con un vuelo suave.
 */
export function PresenterBar() {
  const { t, index, playing } = useStory();
  const track = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const hito = hitoAt(t);
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copiá el enlace a este instante:', url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const tAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * TOTAL_SECONDS;
  };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.jt-hito')) return;
    void start();
    track.current?.setPointerCapture(e.pointerId);
    setDragging(true);
    stop();
    seekNow(tAt(e.clientX));
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) seekNow(tAt(e.clientX));
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    track.current?.releasePointerCapture(e.pointerId);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1.5;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      stop();
      seekNow(t + (e.key === 'ArrowRight' ? step : -step));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      seekNow(e.key === 'Home' ? 0 : TOTAL_SECONDS);
    }
  };

  return (
    <nav className="presenter" aria-label="Controles de la exposición">
      <div className="transport">
        <button type="button" onClick={prev} aria-label="Momento anterior" title="Anterior (←)">⏮</button>
        <button type="button" className="play" onClick={() => { void start(); togglePlay(); }} aria-label={playing ? 'Pausar' : 'Reproducir la exposición'} title="Reproducir / pausar (espacio)">
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" onClick={() => { void start(); next(); }} aria-label="Momento siguiente" title="Siguiente (→)">⏭</button>
        <span className="time">{mmss(t)} / {mmss(TOTAL_SECONDS)}</span>
      </div>

      <div
        ref={track}
        className={`jt${dragging ? ' dragging' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label="Línea de tiempo de la película"
        aria-valuemin={0}
        aria-valuemax={Math.round(TOTAL_SECONDS)}
        aria-valuenow={Math.round(t)}
        aria-valuetext={hito ? `${mmss(t)} · ${hito.label}, ${hito.when}` : mmss(t)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      >
        <div className="jt-acts" aria-hidden="true">
          {beats.map((b, i) => {
            const act = ACTS.find((a) => a.id === b.act)!;
            const first = i === 0 || beats[i - 1].act !== b.act;
            return (
              <span key={b.id} className={`jt-seg${i === index ? ' on' : ''}`} style={{ flexGrow: b.dur }} title={`${act.num} · ${b.title}`}>
                {first && <em>{act.num}</em>}
              </span>
            );
          })}
        </div>
        <div className="jt-fill" style={{ width: `${(t / TOTAL_SECONDS) * 100}%` }} aria-hidden="true" />
        {HITOS.map((h) => (
          <button
            key={h.id}
            type="button"
            className={`jt-hito${hito?.id === h.id ? ' on' : ''}${h.t <= t ? ' past' : ''}`}
            style={{ left: `${(h.t / TOTAL_SECONDS) * 100}%` }}
            onClick={() => { void start(); flyTo(h.t); }}
            aria-label={`${h.label}: ${h.when}`}
          >
            <i aria-hidden="true" />
            <span className="jt-tip">
              <b>{h.label}</b> {h.when}
            </span>
          </button>
        ))}
        <div className="jt-handle" style={{ left: `${(t / TOTAL_SECONDS) * 100}%` }} aria-hidden="true" />
      </div>
      <span className="jt-now" aria-live="polite">{hito ? `${hito.label}` : ''}</span>
      <button type="button" className="share" onClick={() => void share()} title="Copiar el enlace a este instante de la película" aria-label="Copiar enlace a este instante">
        {copied ? '✓ copiado' : '🔗 enlace'}
      </button>
    </nav>
  );
}
