import type { Certainty } from '../data/types';
import { DIST } from '../data/distances';
import { COAST_NEAREST_0028, HYPOTHESIS_SPEED } from '../data/positions';
import { searchFacts2017, DAYS_TO_FIND } from '../data/search';
import { DEBRIS_FIELD_M, WRECK_DEPTH_M, SUBMARINE } from '../data/depth';
import { kgfPerCm2 } from '../utils/physics';
import { fmt0, fmt1 } from '../utils/format';

/**
 * GUION DE LA EXPERIENCIA (~66 s en modo exposición).
 *
 * Cada «momento» (beat) dura `dur` segundos en la reproducción automática y ocupa una altura de
 * scroll proporcional. Los textos sólo dicen lo que está documentado; los números se calculan
 * desde data/ para que no haya dos versiones de un mismo dato. La parte visual (cámara, capas
 * 3D, sonido) se decide en three/ y audio/ a partir del `id` y del avance `p` (0 a 1).
 */

/** «Mundo» 3D en el que transcurre el momento. Cambiar de mundo implica un fundido. */
export type WorldId = 'map' | 'depth' | 'concept';

/** Escena sonora: qué capas de ambiente suenan. Nunca hay silencio total ni voz. */
export type SoundScene = 'superficie' | 'mapa' | 'casco' | 'silencio' | 'profundo' | 'concepto' | 'memoria';

export type ActId = 'personas' | 'viaje' | 'ultimas' | 'silencio' | 'profundidad' | 'memoria';

export const ACTS: { id: ActId; num: string; label: string }[] = [
  { id: 'personas', num: 'I', label: 'Las personas' },
  { id: 'viaje', num: 'II', label: 'El viaje' },
  { id: 'ultimas', num: 'III', label: 'Las últimas horas' },
  { id: 'silencio', num: 'IV', label: 'El silencio' },
  { id: 'profundidad', num: 'V', label: 'La profundidad' },
  { id: 'memoria', num: 'VI', label: 'Memoria' },
];

export interface BeatLine {
  text: string;
  /** Avance (0 a 1) desde el que aparece la línea: capas de información progresivas. */
  from?: number;
}

export interface Beat {
  id: string;
  act: ActId;
  dur: number;
  world: WorldId;
  sound: SoundScene;
  /** Cómo se presenta el texto: tarjeta, portada (memorial) o cierre. */
  layout: 'card' | 'cover' | 'closing';
  eyebrow: string;
  title: string;
  big?: string;
  lines: BeatLine[];
  note?: string;
  certainty: Certainty[];
  sourceIds: string[];
  /** Acento coral: problema técnico informado. */
  tone?: 'alerta';
  /** Reloj documentado (hora oficial argentina). */
  clock?: { fecha: string; hora?: string };
}

const REQ = 'infobae2026requerimiento';
const stat = (id: string) => searchFacts2017.find((f) => f.id === id)!;

export const beats: Beat[] = [
  // ——— I · LAS PERSONAS ———
  {
    id: 'memorial', act: 'personas', dur: 5, world: 'depth', sound: 'superficie', layout: 'cover',
    eyebrow: '15 de noviembre de 2017',
    title: 'ARA San Juan',
    lines: [{ text: '44 personas. Una última coordenada. 367 días sin saber dónde estaban.' }],
    note: 'Retratos oficiales del memorial «44 Presentes» (Ministerio de Defensa y Armada Argentina), en el orden de la nómina del Decreto 212/2020.',
    certainty: ['hecho'], sourceIds: ['decreto212', 'memorial44'],
  },
  {
    id: 'contexto', act: 'personas', dur: 4, world: 'map', sound: 'mapa', layout: 'card',
    eyebrow: 'Mayo de 2017 · Buenos Aires',
    title: 'Un submarino y su tripulación',
    lines: [
      { text: `El ARA San Juan medía ${fmt1(SUBMARINE.esloraM)} m de eslora y tenía su base en Mar del Plata.` },
      { text: 'El 15 de noviembre de 2017 dejó de comunicarse en el Mar Argentino, con 44 personas a bordo.', from: 0.3 },
    ],
    certainty: ['hecho'], sourceIds: ['mdpEmtur', 'commonsSanJuan2017', REQ],
  },

  // ——— II · EL VIAJE ———
  {
    id: 'viaje', act: 'viaje', dur: 7, world: 'map', sound: 'mapa', layout: 'card',
    eyebrow: '25 oct. → 15 nov. 2017',
    title: 'La última misión',
    lines: [
      { text: 'Zarpó de Mar del Plata el 25 de octubre.' },
      { text: 'Hizo escala en Ushuaia del 4 al 8 de noviembre.', from: 0.4 },
      { text: 'Después salió a patrullar el Mar Argentino.', from: 0.62 },
    ],
    note: 'La línea punteada es esquemática: une lugares documentados. El recorrido real no fue publicado. El submarino es un símbolo, no está a escala.',
    certainty: ['hecho', 'hipotesis'], sourceIds: [REQ],
  },

  // ——— III · LAS ÚLTIMAS HORAS ———
  {
    id: 'c2342', act: 'ultimas', dur: 3, world: 'map', sound: 'casco', layout: 'card', tone: 'alerta',
    eyebrow: '14 nov. · 23:42', clock: { fecha: '14 nov. 2017', hora: '23:42' },
    title: '«Principio de incendio controlado»',
    lines: [
      { text: 'Llamada satelital: un cortocircuito en las baterías. Navegaba en superficie, ventilando, con temporal.' },
    ],
    note: 'Esta comunicación no tiene posición publicada.',
    certainty: ['hecho'], sourceIds: [REQ],
  },
  {
    id: 'c0028', act: 'ultimas', dur: 5, world: 'map', sound: 'casco', layout: 'card',
    eyebrow: '15 nov. · 00:28', clock: { fecha: '15 nov. 2017', hora: '00:28' },
    title: 'La última coordenada',
    big: '46°44′ S · 60°08′ O',
    lines: [
      { text: `Es decir: en alta mar, a unos ${fmt0(COAST_NEAREST_0028.km)} km de la costa de ${COAST_NEAREST_0028.provincia}.`, from: 0.2 },
      { text: `A ${fmt0(DIST.mdp)} km de Mar del Plata, su base.`, from: 0.45 },
    ],
    note: 'Posición GPS informada por teléfono satelital. Es la única publicada de esas horas. Distancias: cálculo propio.',
    certainty: ['hecho'], sourceIds: [REQ, 'naturalEarth'],
  },
  {
    id: 'c0600', act: 'ultimas', dur: 5, world: 'map', sound: 'casco', layout: 'card', tone: 'alerta',
    eyebrow: '15 nov. · 06:00', clock: { fecha: '15 nov. 2017', hora: '06:00' },
    title: 'Agua en el tanque de baterías N.º 3',
    lines: [{ text: 'El submarino informa la avería por mensaje escrito:' }],
    certainty: ['hecho'], sourceIds: [REQ],
  },
  {
    id: 'c0719', act: 'ultimas', dur: 4, world: 'map', sound: 'casco', layout: 'card',
    eyebrow: '15 nov. · 07:19', clock: { fecha: '15 nov. 2017', hora: '07:19' },
    title: 'Última comunicación',
    big: '18 m',
    lines: [
      { text: 'Por teléfono satelital: navegaba a 18 m de profundidad, rumbo 015°.' },
      { text: 'Iba a bajar a 40 m, descansar y después abrir el tanque de baterías.', from: 0.3 },
    ],
    note: 'No se publicó dónde estaba en ese momento.',
    certainty: ['hecho'], sourceIds: [REQ],
  },

  // ——— IV · EL SILENCIO ———
  {
    id: 'silencio', act: 'silencio', dur: 5, world: 'map', sound: 'silencio', layout: 'card',
    eyebrow: '15 nov. · 08:27 → 10:51',
    title: 'Sin respuesta',
    lines: [
      { text: '08:27 · Desde tierra le ordenan reportar más seguido. Sin respuesta.' },
      { text: '09:35 · Le ordenan actualizar su situación. «Nunca hubo respuesta».', from: 0.3 },
      { text: '10:51 · Hidrófonos del CTBTO, a miles de kilómetros, registran un evento acústico impulsivo cerca de la zona.', from: 0.62 },
    ],
    note: `Círculo ámbar: hipótesis de alcance a ${HYPOTHESIS_SPEED.nudos} nudos en cualquier dirección, no una posición. Anillo celeste: ubicación estimada del evento.`,
    certainty: ['hecho', 'estimacion', 'hipotesis'], sourceIds: [REQ, 'ctbto2017'],
  },

  // ——— V · LA PROFUNDIDAD ———
  {
    id: 'descenso', act: 'profundidad', dur: 10, world: 'depth', sound: 'profundo', layout: 'card',
    eyebrow: 'De 0 a 907 metros',
    title: '¿Cuánto son 907 metros?',
    lines: [
      { text: `El submarino (${fmt1(SUBMARINE.esloraM)} m) medía casi lo mismo que el Obelisco (67,5 m).` },
      { text: 'Bajamos a escala real. El indicador de profundidad muestra qué se sabe de cada tramo.', from: 0.16 },
      { text: 'Las siluetas están apoyadas en el fondo: ni el Burj Khalifa asomaría a la superficie.', from: 0.5 },
    ],
    note: 'Ningún dato publicado indica cuándo ni cómo descendió el submarino por debajo de los 18 m. Fondo: batimetría GEBCO 2020 del sitio. Siluetas: altura real, forma esquemática.',
    certainty: ['hecho'], sourceIds: [REQ, 'armadaGacetilla1711', 'obeliscoGCBA', 'eiffelParis', 'ctbuhBurj', 'gebco2020'],
  },
  {
    id: 'hallazgo', act: 'profundidad', dur: 5, world: 'depth', sound: 'profundo', layout: 'card',
    eyebrow: `17 nov. 2018 · ${DAYS_TO_FIND} días después`, clock: { fecha: '17 nov. 2018' },
    title: '907 metros',
    lines: [
      { text: `Tras una búsqueda con ${stat('paises').valor} países y más de ${fmt0(stat('personas').valor)} personas, el buque de Ocean Infinity encontró el casco resistente en una sola pieza.` },
      { text: `Estaba en un cañón del talud continental. Campo de restos: ${DEBRIS_FIELD_M.a} × ${DEBRIS_FIELD_M.b} m.`, from: 0.35 },
    ],
    note: 'El punto blanco marca la coordenada publicada. El contorno del campo de restos indica su tamaño, no su orientación (no publicada).',
    certainty: ['hecho'], sourceIds: ['mindef2018', 'armadaGacetilla1711', 'armadaMicrositio2018', 'decreto212'],
  },
  {
    id: 'distancia', act: 'profundidad', dur: 3, world: 'map', sound: 'mapa', layout: 'card',
    eyebrow: 'La última coordenada y el hallazgo',
    title: 'Más lejos que hondo',
    big: `${fmt0(DIST.wreck)} km · ${WRECK_DEPTH_M} m`,
    lines: [
      { text: `Los restos estaban a ${fmt0(DIST.wreck)} km de la coordenada de las 00:28 y a ${fmt0(DIST.wreckCtbto)} km de la estimación acústica: unas ${fmt0((DIST.wreck * 1000) / WRECK_DEPTH_M)} veces más lejos que hondo.` },
    ],
    note: 'Cuadrados: posiciones del buque de búsqueda en los partes de la Armada (2018). Barra vertical blanca: 907 m a escala real (el relieve está exagerado). Coordenada del hallazgo: prensa.',
    certainty: ['hecho', 'estimacion'], sourceIds: ['lanacion2018coordenada', 'armadaPartes2018', 'ctbto2017', REQ],
  },
  {
    id: 'implosion', act: 'profundidad', dur: 5, world: 'concept', sound: 'concepto', layout: 'card',
    eyebrow: 'Qué pasó · representación conceptual',
    title: 'Un colapso hacia adentro',
    lines: [
      { text: `A ${WRECK_DEPTH_M} m, el agua empuja con unos ${fmt0(kgfPerCm2(WRECK_DEPTH_M))} kg sobre cada centímetro cuadrado del casco.` },
      { text: 'Cuando la presión supera lo que el casco resiste, colapsa hacia adentro en un instante: una implosión.', from: 0.35 },
      { text: 'A las 10:51 del 15/11/2017 se registró un evento acústico impulsivo; un estudio posterior lo ubicó a 3,5 km de los restos.', from: 0.68 },
    ],
    note: 'Las fuentes judiciales hablan del «colapso» del submarino tras una pérdida de control de profundidad cuyas causas se debaten en juicio. No se publicó a qué profundidad ocurrió. Presión: cálculo propio.',
    certainty: ['hecho', 'hipotesis'], sourceIds: [REQ, 'ctbto2017', 'vergoz2021'],
  },

  // ——— VI · MEMORIA ———
  {
    id: 'cierre', act: 'memoria', dur: 5, world: 'depth', sound: 'memoria', layout: 'closing',
    eyebrow: 'En memoria',
    title: 'Los 44 del ARA San Juan',
    lines: [],
    certainty: ['hecho'], sourceIds: ['decreto212'],
  },
];

/** Segundo de inicio de cada momento en la reproducción automática. */
export const BEAT_START: number[] = beats.reduce<number[]>((acc, _b, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + beats[i - 1].dur);
  return acc;
}, []);

export const TOTAL_SECONDS = beats.reduce((a, b) => a + b.dur, 0);
