import { live } from './live';
import { clamp } from './track';

/**
 * MIRADA LIBRE. El usuario puede arrastrar para mirar alrededor del submarino (o del punto que sigue la
 * cámara) y acercarse o alejarse. Son desvíos sobre la toma de dirección: la película sigue su curso y,
 * si está reproduciéndose, la cámara vuelve sola a su plano al soltar. En pausa el desvío se queda.
 */
const AZ_PER_PX = 0.3;
const EL_PER_PX = 0.24;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 4;

let dragging = false;
let touchEnabled = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const lookStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  /** Los gestos táctiles sólo orbitan si el usuario activó «Mirar» (si no, deslizar recorre la historia). */
  getTouch: () => touchEnabled,
  getActive: () => live.look.active,
};

export function setTouchLook(on: boolean) {
  touchEnabled = on;
  notify();
}

export function canDrag(pointerType: string) {
  return pointerType === 'mouse' || touchEnabled;
}

export function beginDrag() {
  dragging = true;
}

export function dragBy(dx: number, dy: number) {
  if (!dragging) return;
  if (!live.look.active) {
    live.look.active = true;
    notify();
  }
  live.look.dAz -= dx * AZ_PER_PX * live.look.zoom ** 0.15;
  live.look.dEl += dy * EL_PER_PX;
  live.look.dEl = clamp(live.look.dEl, -85, 85);
}

export function endDrag() {
  dragging = false;
}

export function zoomBy(factor: number) {
  live.look.zoom = clamp(live.look.zoom * factor, ZOOM_MIN, ZOOM_MAX);
  live.look.active = true;
  notify();
}

export function resetLook() {
  live.look.dAz = 0;
  live.look.dEl = 0;
  live.look.zoom = 1;
  live.look.active = false;
  dragging = false;
  notify();
}

/** Cada cuadro: si la película corre y el usuario no está arrastrando, el desvío se disuelve. */
export function tickLook(dt: number, playing: boolean) {
  const L = live.look;
  if (dragging || !L.active || !playing) return;
  const k = 1 - Math.exp(-dt / 0.55);
  L.dAz += (0 - L.dAz) * k;
  L.dEl += (0 - L.dEl) * k;
  L.zoom += (1 - L.zoom) * k;
  if (Math.abs(L.dAz) < 0.05 && Math.abs(L.dEl) < 0.05 && Math.abs(L.zoom - 1) < 0.003) resetLook();
}
