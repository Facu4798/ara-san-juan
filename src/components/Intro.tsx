import { CertaintyLegend } from './Certainty';
import { AudioInvite } from './AudioControls';

export function Intro() {
  return (
    <header className="intro">
      <div>
        <div className="mark" aria-hidden="true" />
        <h1>ARA SAN JUAN</h1>
        <div className="dates">15.11.2017 · 00:28 — 17.11.2018</div>
        <p className="question">
          Entre la última coordenada informada y la siguiente pasaron 367 días. ¿Qué se sabía —y qué no— sobre dónde estaba?
        </p>
        <AudioInvite />
        <CertaintyLegend />
      </div>
      <div className="scroll-cue" aria-hidden="true">DESPLAZARSE ↓</div>
    </header>
  );
}
