import { useEffect, useRef, useState } from 'react';

export interface ScrollState {
  /** Progreso global 0..1 dentro de la sección. */
  progress: number;
  /** Índice del paso activo. */
  step: number;
  /** Progreso 0..1 dentro del paso activo. */
  stepProgress: number;
}

/**
 * Progreso de scroll de una sección alta con contenido sticky.
 * La sección debe medir (steps × stepHeightVh) de alto.
 */
export function useScrollSection(steps: number) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<ScrollState>({ progress: 0, step: 0, stepProgress: 0 });

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      const f = progress * steps;
      const step = Math.min(steps - 1, Math.floor(f));
      const stepProgress = Math.min(1, Math.max(0, f - step));
      setState((s) =>
        Math.abs(s.progress - progress) < 0.0005 && s.step === step ? s : { progress, step, stepProgress },
      );
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [steps]);

  return { ref, ...state };
}

/** Tamaño de un elemento con ResizeObserver. */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}
