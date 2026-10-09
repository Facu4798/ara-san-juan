import { useEffect, useRef } from 'react';
import { live } from '../journey/live';
import { storyStore } from '../story/store';
import { T } from '../journey/timeline';
import { flashAt } from '../journey/flash';

/**
 * EFECTOS DE PANTALLA de la presión: viñeta que se cierra, borde ámbar al pasar el límite preventivo
 * (100 m), ruido de película, el único destello del colapso y el oscurecimiento posterior.
 * Son capas HTML/CSS (sin dependencias de postproceso) que leen el entorno calculado por el director
 * del viaje. Todo es puesta en escena: no hay una medición detrás.
 * Con «reducir movimiento» el ruido no se anima y el destello es mucho más tenue.
 */
const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .9  0 0 0 0 .95  0 0 0 0 1  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function ScreenFx() {
  const vignette = useRef<HTMLDivElement>(null);
  const amber = useRef<HTMLDivElement>(null);
  const grain = useRef<HTMLDivElement>(null);
  const black = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const shock = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let n = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      n++;
      const env = live.env;
      if (!env) return;
      const t = storyStore.get().t;
      if (vignette.current) {
        const v = env.vignette;
        const inner = 72 - 40 * v;
        vignette.current.style.opacity = String(Math.min(1, v * 1.1));
        vignette.current.style.background = `radial-gradient(ellipse at center, rgba(2,8,14,0) ${inner}%, rgba(2,8,14,.92) 118%)`;
      }
      if (amber.current) amber.current.style.opacity = String(env.amber);
      if (grain.current) {
        grain.current.style.opacity = String(env.grain * 0.2);
        if (!reduced && n % 3 === 0) grain.current.style.backgroundPosition = `${(Math.random() * 180) | 0}px ${(Math.random() * 180) | 0}px`;
      }
      if (black.current) black.current.style.opacity = String(env.blackout);
      if (flash.current) flash.current.style.opacity = String(flashAt(t - T.colapso) * (reduced ? 0.22 : 0.88));
      if (shock.current) {
        // Onda de presión: un anillo que se abre desde el punto del colapso hasta salir de la pantalla.
        const c = t - T.colapso;
        if (c > 0 && c < 2.8 && !reduced) {
          const r = 4 + 130 * (1 - Math.exp(-c * 1.15));
          const a = Math.pow(1 - c / 2.8, 1.4) * 0.8;
          const x = ((live.collapseNdc.x + 1) / 2) * 100;
          const y = ((1 - live.collapseNdc.y) / 2) * 100;
          shock.current.style.opacity = String(a);
          shock.current.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(190,232,245,0) ${Math.max(0, r - 6)}%, rgba(205,238,248,.85) ${r - 0.6}%, rgba(190,232,245,0) ${r + 7}%)`;
        } else shock.current.style.opacity = '0';
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="screenfx" aria-hidden="true">
      <div ref={vignette} className="fx fx-vignette" />
      <div ref={amber} className="fx fx-amber" />
      <div ref={grain} className="fx fx-grain" style={{ backgroundImage: NOISE }} />
      <div ref={black} className="fx fx-black" />
      <div ref={shock} className="fx fx-shock" />
      <div ref={flash} className="fx fx-flash" />
    </div>
  );
}
