import { clamp } from './track';

/** Destello (0 a 1) en función del tiempo desde el colapso: un solo pulso, sin parpadeo. */
export function flashAt(c: number) {
  if (c < 0) return 0;
  const up = clamp(c / 0.05);
  const down = Math.exp(-Math.max(0, c - 0.05) * 7.5);
  return up * down;
}
