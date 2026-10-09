import type { Certainty } from '../../data/types';

/**
 * PARTES DEL SUBMARINO con información verificada.
 *
 * Sólo se ubican sobre el modelo las cuatro partes que el Ministerio de Defensa informó
 * visibles en el fondo (proa, casco central, popa y vela). Los límites entre secciones del
 * modelo son esquemáticos. Los componentes cuya ubicación interna no se publicó se listan
 * aparte y NO se dibujan: no hay planos con licencia del interior.
 */
export interface SubPart {
  id: 'proa' | 'casco' | 'vela' | 'popa';
  nombre: string;
  /** Posición del punto interactivo sobre el modelo (m, proa hacia +x). */
  at: [number, number, number];
  datos: { texto: string; sourceIds: string[]; certainty: Certainty }[];
}

const REQ = 'infobae2026requerimiento';

export const SUB_PARTS: SubPart[] = [
  {
    id: 'proa', nombre: 'Proa', at: [27, 4.5, 0],
    datos: [
      { texto: 'Una de las cuatro partes visibles en el fondo marino el 17/11/2018.', sourceIds: ['mindef2018'], certainty: 'hecho' },
      { texto: '06:00 del 15/11/2017: «Baterías de proa fuera de servicio» (SITREP).', sourceIds: [REQ], certainty: 'hecho' },
      { texto: 'La ubicación exacta de las baterías dentro de la proa no se publicó.', sourceIds: [], certainty: 'desconocido' },
    ],
  },
  {
    id: 'casco', nombre: 'Casco resistente (sección central)', at: [0, 4.5, 0],
    datos: [
      { texto: 'Una sección mayor, el casco resistente, se encontró en una sola pieza a 907 m.', sourceIds: ['armadaGacetilla1711', 'mindef2018'], certainty: 'hecho' },
      { texto: 'Esa sección mide entre 25 y 30 m de largo por 7 m de ancho; acero de 33 mm.', sourceIds: ['armadaGacetilla1711'], certainty: 'hecho' },
      { texto: 'Qué tramo del casco ocupa esa sección no se publicó: el resaltado del modelo es esquemático.', sourceIds: [], certainty: 'desconocido' },
    ],
  },
  {
    id: 'vela', nombre: 'Vela (torre)', at: [8, 11.5, 0],
    datos: [
      { texto: 'En el fondo, la vela estaba «volcada a 90 grados a la izquierda».', sourceIds: ['mindef2018'], certainty: 'hecho' },
      { texto: '00:28 del 15/11/2017: «El Sr. Comandante se encuentra en el puente».', sourceIds: [REQ], certainty: 'hecho' },
      { texto: 'Forma y medidas de la vela del modelo: genéricas.', sourceIds: [], certainty: 'hipotesis' },
    ],
  },
  {
    id: 'popa', nombre: 'Popa', at: [-27, 4.5, 0],
    datos: [
      { texto: 'Una de las cuatro partes visibles en el fondo marino el 17/11/2018.', sourceIds: ['mindef2018'], certainty: 'hecho' },
      { texto: '06:00 del 15/11/2017: «inmersión propulsando con circuito dividido» (SITREP).', sourceIds: [REQ], certainty: 'hecho' },
    ],
  },
];

/** Componentes mencionados en las fuentes sin ubicación publicada: se listan, no se dibujan. */
export const UNPLACED = [
  { nombre: 'Tanque de baterías N.º 3', texto: 'Ingresó agua de mar «por sistema de ventilación al tanque de baterías N.º 3» (SITREP de las 06:00).', sourceIds: [REQ] },
  { nombre: 'Balcón de barras de baterías', texto: 'Cortocircuito y principio de incendio informados a las 23:42 y a las 06:00.', sourceIds: [REQ] },
  { nombre: 'Sistema de ventilación', texto: 'Vía por la que entró el agua al tanque de baterías N.º 3.', sourceIds: [REQ] },
  { nombre: 'Refrigeración del motor eléctrico', texto: 'Tenía pendiente un examen de presión: de ahí la limitación preventiva de 100 m de profundidad.', sourceIds: [REQ] },
];

/** Ficha técnica documentada. */
export const SUB_SPECS = [
  { k: 'Eslora', v: '65,93 m', sourceIds: ['mdpEmtur'] },
  { k: 'Desplazamiento', v: '2.116 t en superficie · 2.264 t en inmersión', sourceIds: ['mdpEmtur'] },
  { k: 'Casco resistente', v: '7 m de ancho · acero de 33 mm', sourceIds: ['armadaGacetilla1711'] },
  { k: 'Límite de profundidad (nov. 2017)', v: '100 m, preventivo', sourceIds: [REQ] },
  { k: 'Tripulación en la última misión', v: '44 personas', sourceIds: ['decreto212'] },
];
