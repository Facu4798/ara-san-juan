import { useSyncExternalStore } from 'react';

/**
 * ESTADO DE LA VISTA 3D (escala y orientación), publicado por la cámara de exploración para
 * que la interfaz HTML pueda declararlos siempre: cuántas unidades del mundo mide un píxel y
 * hacia dónde queda el norte en pantalla.
 *
 * Se publica sólo cuando el valor cambia de forma apreciable, para no re-renderizar los
 * paneles en cada cuadro.
 */
export interface ViewInfo {
  /** Unidades del mundo por píxel, en el plano del punto de mira (km en los mapas, m en profundidad). */
  unitsPerPx: number;
  /** Ángulo en el que el norte geográfico apunta en pantalla (grados; 0 = arriba, sentido horario). */
  northDeg: number;
  /**
   * Cuánto del norte cabe en el plano de la pantalla (0 a 1). Con la cámara casi horizontal el
   * norte apunta «hacia adentro» y la flecha deja de ser informativa: se atenúa en vez de mentir.
   */
  northLean: number;
}

let state: ViewInfo = { unitsPerPx: 1, northDeg: 0, northLean: 1 };
const listeners = new Set<() => void>();

/** Publica el estado si cambió lo suficiente (1 % de escala, 0,7° de rumbo o 5 % de inclinación). */
export function publishView(next: ViewInfo) {
  if (!Number.isFinite(next.unitsPerPx) || next.unitsPerPx <= 0) return;
  const dScale = Math.abs(next.unitsPerPx - state.unitsPerPx) / state.unitsPerPx;
  let dNorth = Math.abs(next.northDeg - state.northDeg) % 360;
  if (dNorth > 180) dNorth = 360 - dNorth;
  if (dScale < 0.01 && dNorth < 0.7 && Math.abs(next.northLean - state.northLean) < 0.05) return;
  state = next;
  listeners.forEach((l) => l());
}

export function useViewInfo(): ViewInfo {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => state,
    () => state,
  );
}
