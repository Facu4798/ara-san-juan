import type { DepthMarker } from './types';

/** Profundidades documentadas. Se ordenan de superficie a fondo. */
export const depthMarkers: DepthMarker[] = [
  {
    depthM: 18,
    label: 'Plano de periscopio',
    detalle: 'Profundidad informada en la última comunicación (07:19 del 15/11/2017).',
    certainty: 'hecho',
    sourceIds: ['infobae2026requerimiento'],
  },
  {
    depthM: 40,
    label: 'Plano de seguridad',
    detalle: 'Intención declarada en la última comunicación: descender a 40 m.',
    certainty: 'hecho',
    sourceIds: ['infobae2026requerimiento'],
  },
  {
    depthM: 100,
    label: 'Límite preventivo',
    detalle: 'El submarino operaba con una limitación preventiva de profundidad de 100 m por un examen de presión pendiente.',
    certainty: 'hecho',
    sourceIds: ['infobae2026requerimiento'],
  },
  {
    depthM: 800,
    label: 'Primer dato del POI 24',
    detalle: '"A unos 800 metros de profundidad": estimación preliminar informada por la empresa antes de la verificación con ROV.',
    certainty: 'estimacion',
    sourceIds: ['armadaPartes2018'],
  },
  {
    depthM: 907,
    label: 'Casco resistente',
    detalle: 'Una sección mayor, el casco resistente, se encuentra en una sola pieza a 907 metros.',
    certainty: 'hecho',
    sourceIds: ['armadaGacetilla1711', 'mindef2018'],
  },
];

/** Profundidad final verificada. */
export const WRECK_DEPTH_M = 907;

/** Dimensiones usadas por el modelo esquemático. */
export const SUBMARINE = {
  esloraM: 65.93,
  cascoResistenteAnchoM: 7,
  cascoResistenteLargoM: [25, 30] as const,
  espesorAceroMm: 33,
  sourceIds: ['mdpEmtur', 'armadaGacetilla1711'],
};

export const DEBRIS_FIELD_M = { a: 80, b: 100, sourceIds: ['mindef2018', 'armadaGacetilla1711'] };
