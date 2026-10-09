import { depthMarkers, WRECK_DEPTH_M } from '../data/depth';
import { LANDMARKS, tipDepthM } from '../data/landmarks';

/**
 * Marcas del carril de profundidad (HUD de la película y del módulo 907 m). La profundidad que se ve en la película
 * sale de journey/subPath.ts; acá sólo están las referencias documentadas y de altura.
 */
export type MarkKind = 'hecho' | 'estimacion' | 'referencia';

export interface RailMark {
  depthM: number;
  label: string;
  detail: string;
  /** Hora o fecha documentada asociada a esa profundidad. */
  when?: string;
  kind: MarkKind;
  sourceIds: string[];
}

const m = (d: number) => depthMarkers.find((x) => x.depthM === d)!;
const fmtM = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

/** Texto de cada referencia: dónde quedaría su punta si estuviera apoyada a 907 m. */
const TIP_TEXT: Record<string, string> = {
  burj: 'Punta del Burj Khalifa (828 m) apoyado en el fondo',
  eiffel: 'Punta de la Torre Eiffel (330 m) apoyada en el fondo',
  obelisco: 'Punta del Obelisco (67,5 m) apoyado en el fondo',
};

/** Carril profundidad + tiempo + evento. Todo sale de data/: profundidades documentadas y alturas. */
export const RAIL_MARKS: RailMark[] = ([
  { depthM: 0, label: '0 m', detail: 'Navegaba en superficie', when: '00:58', kind: 'hecho', sourceIds: ['infobae2026requerimiento'] },
  { depthM: 18, label: '18 m', detail: 'Última profundidad informada', when: '07:19', kind: 'hecho', sourceIds: m(18).sourceIds },
  { depthM: 40, label: '40 m', detail: 'Iba a bajar hasta acá', when: '07:19', kind: 'hecho', sourceIds: m(40).sourceIds },
  { depthM: 100, label: '100 m', detail: 'Límite preventivo: no debía pasarlo', kind: 'hecho', sourceIds: m(100).sourceIds },
  { depthM: 800, label: '≈ 800 m', detail: 'Aviso preliminar del punto de interés 24', when: '2018', kind: 'estimacion', sourceIds: m(800).sourceIds },
  { depthM: WRECK_DEPTH_M, label: '907 m', detail: 'Hallazgo: casco resistente en una pieza', when: '17/11/2018', kind: 'hecho', sourceIds: m(WRECK_DEPTH_M).sourceIds },
  ...LANDMARKS.map((l) => ({
    depthM: tipDepthM(l),
    label: `${fmtM(tipDepthM(l))} m`,
    detail: TIP_TEXT[l.id],
    kind: 'referencia' as const,
    sourceIds: l.sourceIds,
  })),
] as RailMark[]).sort((a, b) => a.depthM - b.depthM);

/** Tramo sin ningún dato publicado sobre el submarino. */
export const NO_DATA_BAND = { from: 100, to: WRECK_DEPTH_M };
