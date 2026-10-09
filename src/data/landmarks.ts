import type { Landmark } from './types';
import { WRECK_DEPTH_M } from './depth';

/**
 * Referencias de altura para entender la profundidad. Sólo la ALTURA (y la base del
 * Obelisco) son datos con fuente; la forma de cada modelo 3D es una silueta esquemática.
 */
export const LANDMARKS: Landmark[] = [
  { id: 'obelisco', nombre: 'Obelisco de Buenos Aires', alturaM: 67.5, baseM: 6.8, forma: 'obelisco', sourceIds: ['obeliscoGCBA'] },
  { id: 'eiffel', nombre: 'Torre Eiffel', alturaM: 330, forma: 'torre', sourceIds: ['eiffelParis'] },
  { id: 'burj', nombre: 'Burj Khalifa', alturaM: 828, forma: 'rascacielos', sourceIds: ['ctbuhBurj'] },
];

export const landmarkById = new Map(LANDMARKS.map((l) => [l.id, l]));

/** Profundidad a la que quedaría la punta si la estructura estuviera apoyada en el fondo, a 907 m. */
export const tipDepthM = (l: Landmark) => WRECK_DEPTH_M - l.alturaM;

/** Cuántos Obeliscos apilados equivalen a una profundidad. Cálculo propio. */
export const obeliscos = (depthM: number) => depthM / landmarkById.get('obelisco')!.alturaM;
