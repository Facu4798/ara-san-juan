import type { SearchFact } from './types';

/** Cifras de la búsqueda con fuente. No se publicaron polígonos de zonas de búsqueda. */
export const searchFacts2017: SearchFact[] = [
  { id: 'paises', valor: 18, unidad: '', label: 'países', periodo: 'desde el 15/11/2017', certainty: 'hecho', sourceIds: ['armadaMicrositio2018'] },
  { id: 'personas', valor: 4000, unidad: '+', label: 'personas', periodo: 'desde el 15/11/2017', certainty: 'hecho', sourceIds: ['armadaMicrositio2018'], nota: '"Más de 4000 hombres".' },
  { id: 'buques', valor: 28, unidad: '', label: 'unidades de superficie', periodo: 'desde el 15/11/2017', certainty: 'hecho', sourceIds: ['armadaMicrositio2018'] },
  { id: 'aeronaves', valor: 9, unidad: '', label: 'aeronaves', periodo: 'desde el 15/11/2017', certainty: 'hecho', sourceIds: ['armadaMicrositio2018'] },
  { id: 'contactos', valor: 78, unidad: '', label: 'contactos investigados', periodo: 'primeros 120 días', certainty: 'hecho', sourceIds: ['armadaMicrositio2018'] },
  { id: 'pendientes', valor: 17, unidad: '', label: 'puntos pendientes entregados a Ocean Infinity', periodo: '22/08/2018', certainty: 'hecho', sourceIds: ['armadaMicrositio2018'] },
];

export const searchFacts2018: SearchFact[] = [
  { id: 'auv', valor: 5, unidad: '', label: 'vehículos autónomos (AUV)', periodo: 'sept.–nov. 2018', certainty: 'hecho', sourceIds: ['oceanInfinity2018inicio', 'armadaMicrositio2018'] },
  { id: 'tripulacion-seco', valor: 60, unidad: '~', label: 'personas a bordo del Seabed Constructor', periodo: 'sept.–nov. 2018', certainty: 'hecho', sourceIds: ['oceanInfinity2018inicio'] },
  { id: 'poi', valor: 24, unidad: '', label: 'N.º del punto de interés que resultó ser el submarino', periodo: '15–17/11/2018', certainty: 'hecho', sourceIds: ['armadaPartes2018', 'armadaGacetilla1711'] },
  { id: 'imagenes', valor: 67000, unidad: '', label: 'imágenes y videos registrados', periodo: 'al 28/11/2018', certainty: 'hecho', sourceIds: ['armadaMicrositio2018'] },
];

/** Días calendario entre la desaparición y la identificación. */
export const DAYS_TO_FIND = 367;
