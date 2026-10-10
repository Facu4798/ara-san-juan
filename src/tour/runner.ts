import { CAPTIONS, CUES, EXPLORE_AT, TOUR_SECONDS, captionAt, fadeAt, filmTimeAt, trackValuesAt, type CursorGoal, type Cue, type Look, type TrackValues } from './script';

/**
 * EJECUTOR DEL GUION. Puro (sin DOM ni React): recibe el tiempo transcurrido del tour y llama a los
 * «hooks» que conectan con la página (director.ts) o con un registro de pruebas (scripts/check-tour.mjs).
 *
 * Reglas que lo hacen exacto:
 *  - todo se calcula a partir de `e` (segundos transcurridos), nunca por conteo de cuadros;
 *  - cada acción única se ejecuta una sola vez y en orden, aunque se hayan salteado cuadros;
 *  - `e` se limita a TOUR_SECONDS: al llegar, el tour termina.
 */
export interface Hooks {
  film(t: number): void;
  /** `e` es el instante real del tour: permite descartar acciones que llegaron tarde (p. ej. con la pestaña oculta). */
  cue(c: Cue, e: number): void;
  look(v: Look | null): void;
  track(v: { travesiaT?: number; busquedaT?: number; depth?: number }): void;
  /** Cursor «arrastrando» un control (sobre la última acción de cursor), o null. */
  drag(v: (CursorGoal & { down: boolean }) | null): void;
  ui(s: { e: number; caption: string; chapter: string; fade: number; ended: boolean }): void;
}

export class TourRunner {
  private next = 0;
  private hadLook = false;
  private hadDrag = false;
  private lastE = 0;
  ended = false;

  constructor(private hooks: Hooks) {}

  /** Avanza el tour hasta el instante `e` (segundos). Seguro de llamar muchas veces. */
  advance(eRaw: number) {
    const e = Math.min(TOUR_SECONDS, Math.max(this.lastE, eRaw));
    this.lastE = e;

    // 1) Acciones únicas cruzadas desde la última llamada, en orden.
    while (this.next < CUES.length && CUES[this.next].at <= e) this.hooks.cue(CUES[this.next++], e);

    // 2) Película (sólo en la primera parte).
    if (e < EXPLORE_AT) this.hooks.film(filmTimeAt(e));

    // 3) Animaciones continuas.
    const v: TrackValues = trackValuesAt(e);
    if (v.look) {
      this.hooks.look(v.look);
      this.hadLook = true;
    } else if (this.hadLook) {
      this.hooks.look(null);
      this.hadLook = false;
    }
    this.hooks.track({ travesiaT: v.travesiaT, busquedaT: v.busquedaT, depth: v.depth });
    if (v.cursor) {
      this.hooks.drag(v.cursor);
      this.hadDrag = true;
    } else if (this.hadDrag) {
      this.hooks.drag(null);
      this.hadDrag = false;
    }

    // 4) Interfaz del tour.
    const cap = captionAt(e);
    this.ended = e >= TOUR_SECONDS;
    this.hooks.ui({ e, caption: cap.text, chapter: cap.chapter, fade: fadeAt(e), ended: this.ended });
    return e;
  }
}

export { CAPTIONS };
