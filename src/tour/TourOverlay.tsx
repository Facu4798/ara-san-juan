import { useEffect, useRef, useState } from 'react';
import { dismissGate, exitTour, startTour, tourStore, useTour } from './director';
import { preloadVoiceFiles, setVoiceOn, useVoiceOn } from './voice';
import { CUTS, EXPLORE_AT, TOUR_SECONDS } from './script';
import type { CursorGoal } from './script';

/**
 * CAPA DEL TOUR: barra de progreso de 60 s con cuenta regresiva, subtítulo, cursor fantasma que se
 * mueve sobre los controles reales, aro de resaltado, cortina de fundido, escudo que impide tocar la
 * página mientras corre, y la tarjeta final. También la tarjeta «Comenzar» cuando se llega con #tour.
 */
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const FINAL_AT = 56.4;

function query(target: string) {
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
}

/** Rectángulo visible de un control (o null si no está en pantalla). */
function visibleRect(target: string) {
  const el = query(target);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
  return r;
}

function goalPx(g: CursorGoal | null): { x: number; y: number } | null {
  if (!g) return null;
  if (g.target) {
    const r = visibleRect(g.target);
    if (!r) return null;
    return { x: r.left + r.width * (g.fx ?? 0.5), y: r.top + r.height * (g.fy ?? 0.5) };
  }
  return { x: innerWidth * (g.x ?? 0.5), y: innerHeight * (g.y ?? 0.5) };
}

export function TourOverlay() {
  const phase = useTour((s) => s.phase);
  if (phase === 'idle') return null;
  if (phase === 'gate') return <Gate />;
  return <Running />;
}

function VoiceToggle() {
  const on = useVoiceOn();
  return (
    <button type="button" className="tour-voice" aria-pressed={on} onClick={() => setVoiceOn(!on)} title="Narración con voz masculina sintetizada con IA">
      {on ? '🔊' : '🔇'} Voz
    </button>
  );
}

function Gate() {
  preloadVoiceFiles();
  return (
    <div className="tour-gate" role="dialog" aria-label="Tour de 1 minuto">
      <div className="tour-gate-card">
        <div className="eyebrow">Tour de 1 minuto</div>
        <h2>Una vuelta rápida por toda la página</h2>
        <p>El recorrido del submarino y un vistazo a Explorar, en 60 segundos exactos, con narración de una voz masculina sintetizada con IA. Mejor con auriculares.</p>
        <div className="tour-gate-voice"><VoiceToggle /></div>
        <div className="tour-actions">
          <button type="button" className="btn-primary" onClick={() => startTour()}>▶ Comenzar el tour</button>
          <button type="button" className="btn-ghost" onClick={dismissGate}>Ir a la página</button>
        </div>
      </div>
    </div>
  );
}

function Running() {
  const e = useTour((s) => s.e);
  const caption = useTour((s) => s.caption);
  const chapter = useTour((s) => s.chapter);
  const fade = useTour((s) => s.fade);
  const pulse = useTour((s) => s.pulse);
  const phase = useTour((s) => s.phase);
  const shield = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const ringEl = useRef<HTMLDivElement>(null);
  const [clickAt, setClickAt] = useState<{ x: number; y: number; k: number } | null>(null);
  const showFinal = e >= FINAL_AT || phase === 'ended';
  const left = Math.max(0, TOUR_SECONDS - e);

  // El escudo no deja que la rueda ni el tacto muevan la página.
  useEffect(() => {
    const el = shield.current;
    if (!el) return;
    const stop = (ev: Event) => ev.preventDefault();
    el.addEventListener('wheel', stop, { passive: false });
    el.addEventListener('touchmove', stop, { passive: false });
    return () => {
      el.removeEventListener('wheel', stop);
      el.removeEventListener('touchmove', stop);
    };
  }, []);

  // Cursor fantasma y aro: se acomodan cada cuadro sobre el control real al que apuntan.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let pos: { x: number; y: number } | null = null;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = tourStore.get();
      const goal = goalPx(s.drag ?? s.cursor);
      const c = cursor.current;
      if (c) {
        if (goal) {
          if (!pos) pos = { x: goal.x, y: goal.y + 60 };
          const k = 1 - Math.exp(-dt / (s.drag ? 0.08 : 0.17));
          pos.x += (goal.x - pos.x) * k;
          pos.y += (goal.y - pos.y) * k;
          c.style.opacity = '1';
          c.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${s.drag?.down ? 0.88 : 1})`;
        } else {
          c.style.opacity = '0';
          pos = null;
        }
      }
      const r = ringEl.current;
      if (r) {
        const rect = s.ring ? visibleRect(s.ring) : null;
        if (rect) {
          r.style.opacity = '1';
          r.style.left = `${rect.left - 6}px`;
          r.style.top = `${rect.top - 6}px`;
          r.style.width = `${rect.width + 12}px`;
          r.style.height = `${rect.height + 12}px`;
        } else r.style.opacity = '0';
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Onda de clic donde está el cursor.
  useEffect(() => {
    if (!pulse) return;
    const c = cursor.current;
    const m = c?.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);
    if (m) setClickAt({ x: Number(m[1]), y: Number(m[2]), k: pulse });
  }, [pulse]);

  return (
    <>
      <div ref={shield} className="tour-shield" aria-hidden="true" />
      <div className="tour-fade" style={{ opacity: fade }} aria-hidden="true" />
      <div ref={ringEl} className="tour-ring" aria-hidden="true" />
      {clickAt && <div key={clickAt.k} className="tour-ripple" style={{ left: clickAt.x, top: clickAt.y }} aria-hidden="true" />}
      <div ref={cursor} className="tour-cursor" aria-hidden="true">
        <svg width="30" height="34" viewBox="0 0 30 34">
          <path d="M3 2 L3 25 L9 19.5 L13.4 29.5 L17.6 27.6 L13.2 17.8 L21.5 17.2 Z" fill="#fff" stroke="#0b2233" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="tour-bar" aria-hidden="true">
        <div className="fill" style={{ width: `${(Math.min(e, TOUR_SECONDS) / TOUR_SECONDS) * 100}%` }} />
        {CUTS.map((c) => (
          <i key={c.at} className={c.at === EXPLORE_AT ? 'major' : ''} style={{ left: `${(c.at / TOUR_SECONDS) * 100}%` }} />
        ))}
      </div>
      <div className="tour-chip">
        <span className="tour-live" aria-hidden="true" />
        <span className="chap">{chapter}</span>
        <span className="time" role="timer" aria-label={`Quedan ${Math.ceil(left)} segundos`}>{mmss(Math.ceil(left))}</span>
        <VoiceToggle />
        <button type="button" className="tour-exit" onClick={() => exitTour('close')}>Salir · Esc</button>
      </div>
      {!showFinal && (
        <p className="tour-caption" key={caption} aria-live="polite">
          {caption}
        </p>
      )}
      {showFinal && (
        <div className="tour-final" role="dialog" aria-label="Fin del tour">
          <div className="eyebrow">Fin del tour · 1:00</div>
          <h2>44 personas, una coordenada, 367 días</h2>
          <p>Todo lo que viste es explorable: la película, el submarino, los 4 módulos de datos y cada fuente.</p>
          <p className="tour-credit">Narración: voz masculina sintetizada con IA (Microsoft Edge TTS · es-AR-TomasNeural). No es una persona real.</p>
          <div className="tour-actions">
            <button type="button" className="btn-primary" onClick={() => exitTour('film')}>▶ Ver la película</button>
            <button type="button" className="btn-ghost" onClick={() => exitTour('explore')}>Explorar los datos</button>
            <button type="button" className="btn-ghost" onClick={() => exitTour('repeat')}>↺ Repetir el tour</button>
            <button type="button" className="btn-ghost" onClick={() => exitTour('close')}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}
