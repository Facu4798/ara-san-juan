import { ACTS, beats, BEAT_START, TOTAL_SECONDS } from '../story/beats';
import { goToBeat, next, prev, togglePlay, useStory } from '../story/store';
import { start } from '../audio/engine';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Barra del presentador: reproducir el minuto completo, avanzar o retroceder un momento,
 * ver en qué etapa se está y controlar el sonido ambiente.
 */
export function PresenterBar() {
  const { t, index, playing } = useStory();
  return (
    <nav className="presenter" aria-label="Controles de la exposición">
      <div className="transport">
        <button type="button" onClick={prev} aria-label="Momento anterior" title="Anterior (←)">⏮</button>
        <button type="button" className="play" onClick={() => { void start(); togglePlay(); }} aria-label={playing ? 'Pausar' : 'Reproducir la exposición'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" onClick={() => { void start(); next(); }} aria-label="Momento siguiente" title="Siguiente (→ o espacio)">⏭</button>
        <span className="time">{mmss(t)} / {mmss(TOTAL_SECONDS)}</span>
      </div>

      <ol className="timeline" aria-label="Momentos">
        {beats.map((b, i) => {
          const fill = i < index ? 1 : i > index ? 0 : (t - BEAT_START[i]) / b.dur;
          const act = ACTS.find((a) => a.id === b.act)!;
          const firstOfAct = i === 0 || beats[i - 1].act !== b.act;
          return (
            <li key={b.id} style={{ flexGrow: b.dur }}>
              <button type="button" onClick={() => goToBeat(i)} aria-current={i === index} title={`${act.num} · ${b.title}`}>
                <span className="fill" style={{ transform: `scaleX(${Math.max(0, Math.min(1, fill))})` }} />
              </button>
              {firstOfAct && <span className="act-tick">{act.num}</span>}
            </li>
          );
        })}
      </ol>

    </nav>
  );
}
