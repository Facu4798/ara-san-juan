import { landmarkById } from '../../data/landmarks';
import { WRECK_DEPTH_M } from '../../data/depth';

/**
 * MÓDULO 4 · Explorador de profundidad.
 *
 * Comparaciones PROGRESIVAS: cada estructura aparece sólo en su tramo, de a una, y se dibuja
 * con la base a la profundidad alcanzada y la punta en la superficie. Así se compara una
 * profundidad con una altura sin confundirlas: «si la apoyaras acá, su punta llegaría arriba».
 */
export interface Comparison {
  id: 'obelisco' | 'eiffel' | 'burj' | 'hallazgo';
  depth: number;
  /** Tramo de profundidad en el que se muestra. */
  from: number;
  to: number;
  texto: string;
  detalle: string;
  sourceIds: string[];
}

const L = (id: string) => landmarkById.get(id)!;

export const COMPARISONS: Comparison[] = [
  {
    id: 'obelisco', depth: L('obelisco').alturaM, from: 62, to: 165,
    texto: 'Ya descendiste aproximadamente la altura del Obelisco.',
    detalle: 'Obelisco de Buenos Aires: 67,5 m. Apoyado a esta profundidad, su punta llegaría a la superficie.',
    sourceIds: L('obelisco').sourceIds,
  },
  {
    id: 'eiffel', depth: L('eiffel').alturaM, from: 318, to: 480,
    texto: 'Esta profundidad equivale aproximadamente a la altura de la Torre Eiffel.',
    detalle: 'Torre Eiffel: 330 m (con la antena de 2022).',
    sourceIds: L('eiffel').sourceIds,
  },
  {
    id: 'burj', depth: L('burj').alturaM, from: 815, to: 898,
    texto: 'Ya descendiste la altura del Burj Khalifa.',
    detalle: 'Burj Khalifa: 828 m de altura arquitectónica (CTBUH). El hallazgo está 79 m más abajo.',
    sourceIds: L('burj').sourceIds,
  },
  {
    id: 'hallazgo', depth: WRECK_DEPTH_M, from: 900, to: 908,
    texto: '907 metros bajo la superficie.',
    detalle: 'Profundidad a la que se encontró el casco resistente del ARA San Juan (17/11/2018).',
    sourceIds: ['armadaGacetilla1711', 'mindef2018'],
  },
];

/** Comparación visible a la profundidad d (y su opacidad), o la última alcanzada si está fijada. */
export function comparisonAt(d: number, pinned: boolean): { c: Comparison; opacity: number } | null {
  for (const c of COMPARISONS) {
    if (d >= c.from && d < c.to) {
      const fadeIn = Math.min(1, (d - c.from) / 8);
      const fadeOut = c.id === 'hallazgo' ? 1 : Math.min(1, (c.to - d) / 30);
      return { c, opacity: Math.max(0.05, Math.min(fadeIn, fadeOut)) };
    }
  }
  if (pinned) {
    const passed = COMPARISONS.filter((c) => d >= c.depth);
    if (passed.length) return { c: passed[passed.length - 1], opacity: 0.85 };
  }
  return null;
}

/** Zona de luz según NOAA (Ocean Service, «How far does light travel in the ocean?»). */
export function lightZone(d: number) {
  if (d < 200) return { zona: 'Eufótica (luz solar)', texto: 'Hasta los 200 m llega la luz del sol.' };
  return { zona: 'Disfótica (penumbra)', texto: 'Entre 200 y 1.000 m la luz disminuye rápidamente: no alcanza para la fotosíntesis.' };
}

/** Paradas rápidas del control de profundidad (todas documentadas o de referencia). */
export const DEPTH_STOPS = [
  { d: 0, label: 'Superficie' },
  { d: 18, label: '18 m · 07:19' },
  { d: 40, label: '40 m · intención' },
  { d: 67.5, label: 'Obelisco' },
  { d: 100, label: '100 m · límite' },
  { d: 200, label: '200 m · fin de la luz solar' },
  { d: 330, label: 'Torre Eiffel' },
  { d: 828, label: 'Burj Khalifa' },
  { d: WRECK_DEPTH_M, label: '907 m · hallazgo' },
];
