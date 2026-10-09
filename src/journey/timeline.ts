import { beats, BEAT_START, TOTAL_SECONDS } from '../story/beats';

/**
 * LÍNEA DE TIEMPO DE LA PELÍCULA. Un solo reloj (segundos del guion) del que dependen la cámara,
 * el submarino, el clima, las luces y el sonido. Los instantes salen de `story/beats.ts`: si se
 * cambia una duración, todo se corre solo.
 */
const startOf = (id: string) => {
  const i = beats.findIndex((b) => b.id === id);
  if (i < 0) throw new Error(`Momento inexistente: ${id}`);
  return BEAT_START[i];
};
const durOf = (id: string) => beats[beats.findIndex((b) => b.id === id)].dur;

export const T = {
  memorial: startOf('memorial'),
  viaje: startOf('viaje'),
  c2342: startOf('c2342'),
  c0028: startOf('c0028'),
  c0600: startOf('c0600'),
  c0719: startOf('c0719'),
  silencio: startOf('silencio'),
  descenso: startOf('descenso'),
  colapso: startOf('colapso'),
  hallazgo: startOf('hallazgo'),
  distancia: startOf('distancia'),
  cierre: startOf('cierre'),
  end: TOTAL_SECONDS,
} as const;

export const D = {
  viaje: durOf('viaje'),
  silencio: durOf('silencio'),
  descenso: durOf('descenso'),
  colapso: durOf('colapso'),
  hallazgo: durOf('hallazgo'),
} as const;

/** Hitos documentados: puntos de la barra de tiempo a los que se puede saltar. */
export interface Hito {
  id: string;
  t: number;
  label: string;
  when: string;
  /** Acontecimiento de data/events.ts con su fuente y certeza. */
  eventId: string;
}

export const HITOS: Hito[] = [
  { id: 'zarpe', t: T.viaje + 3.8, label: 'Zarpe', when: '25/10/2017 · Mar del Plata', eventId: 'zarpe-mdp' },
  { id: 'ushuaia', t: T.viaje + 6.4, label: 'Ushuaia', when: '4 al 8/11/2017', eventId: 'arribo-ushuaia' },
  { id: 'patrulla', t: T.viaje + 9.4, label: 'Patrulla', when: '8 al 14/11/2017', eventId: 'zarpe-ushuaia' },
  { id: 'c2342', t: T.c2342 + 0.7, label: '23:42', when: '14/11 · principio de incendio', eventId: 'c2342' },
  { id: 'c0028', t: T.c0028 + 1.4, label: '00:28', when: '15/11 · última coordenada', eventId: 'c0028' },
  { id: 'c0600', t: T.c0600 + 0.9, label: '06:00', when: '15/11 · ingreso de agua', eventId: 'c0600' },
  { id: 'c0719', t: T.c0719 + 0.9, label: '07:19', when: '15/11 · última comunicación', eventId: 'c0719' },
  { id: 'c0827', t: T.silencio + 0.9, label: '08:27', when: '15/11 · sin respuesta', eventId: 'c0827' },
  { id: 'c0935', t: T.silencio + 3.3, label: '09:35', when: '15/11 · sin respuesta', eventId: 'c0935' },
  { id: 'ctbto', t: T.colapso + 0.3, label: '10:51', when: '15/11 · evento acústico', eventId: 'ctbto' },
  { id: 'hallazgo', t: T.hallazgo + 2.6, label: 'Hallazgo', when: '17/11/2018 · 907 m', eventId: 'identificacion' },
];

/** Hito vigente en el instante t (el último que ya pasó). */
export function hitoAt(t: number): Hito | null {
  let cur: Hito | null = null;
  for (const h of HITOS) if (h.t <= t + 0.05) cur = h;
  return cur;
}
