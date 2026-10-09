/**
 * Tipos del dominio. Todo dato visualizado debe poder rastrearse a una Source
 * y declarar su nivel de certeza.
 */

/** Nivel epistémico de un dato. Se muestra en la interfaz, no solo en metodología. */
/**
 * hecho: confirmado por una fuente documental identificable.
 * estimacion: valor aproximado obtenido con un procedimiento explícito.
 * hipotesis: reconstrucción o hipótesis propia, siempre rotulada (trazado esquemático, alcance a 5 nudos…).
 * desconocido: no puede establecerse con las fuentes disponibles.
 */
export type Certainty = 'hecho' | 'estimacion' | 'hipotesis' | 'desconocido';

export type SourceKind =
  | 'oficial'
  | 'judicial-via-prensa'
  | 'cientifica'
  | 'empresa'
  | 'periodistica'
  | 'dataset'
  | 'registro-visual';

export interface Source {
  id: string;
  institucion: string;
  titulo: string;
  url: string;
  /** URL archivada cuando el original ya no está disponible. */
  archivo?: string;
  /** Fecha del documento (ISO, puede ser solo año-mes-día). */
  fecha: string;
  tipo: SourceKind;
  aporta: string;
  limitaciones: string;
}

export type PositionKind = 'submarino' | 'anomalia' | 'hallazgo' | 'buque-busqueda' | 'referencia';

export interface Position {
  id: string;
  label: string;
  lat: number;
  lon: number;
  /** ISO 8601 con huso horario (-03:00 = hora oficial argentina). */
  datetime?: string;
  kind: PositionKind;
  certainty: Certainty;
  /** Texto de la coordenada tal como aparece en la fuente. */
  textoFuente?: string;
  /** Incertidumbre publicada. Nunca se dibuja un área si no hay dimensiones documentadas. */
  incertidumbre?: {
    ejeMayorKm: number;
    ejeMenorKm: number;
    confianza?: string;
    sourceId: string;
  };
  sourceIds: string[];
  nota?: string;
}

export type Phase =
  | 'mision'
  | 'ultimas-horas'
  | 'silencio'
  | 'busqueda-2017'
  | 'busqueda-2018'
  | 'hallazgo'
  | 'posterior';

export type TimePrecision = 'minuto' | 'dia' | 'aproximada';

export interface TimelineEvent {
  id: string;
  datetime: string;
  precision: TimePrecision;
  phase: Phase;
  titulo: string;
  detalle: string;
  certainty: Certainty;
  sourceIds: string[];
  positionId?: string;
  /** Profundidad documentada asociada al evento (m). */
  profundidadM?: number;
  /** Evento sin respuesta / comunicación fallida. */
  sinRespuesta?: boolean;
  nota?: string;
}

export interface DepthMarker {
  depthM: number;
  label: string;
  detalle: string;
  certainty: Certainty;
  sourceIds: string[];
}

export interface CrewMember {
  /** Orden de aparición en el Decreto 212/2020. No indica ubicación a bordo. */
  orden: number;
  nombreCompleto: string;
  /** Grado tal como figura en el Decreto 212/2020 (previo al ascenso post mortem). */
  gradoDecreto: string;
  /** Art. 1: ascenso al 15/11/2017. Art. 2: ascenso al 02/01/2018. */
  articuloDecreto: 1 | 2;
  /** Grado consignado por la prensa en 2017, sólo si difiere del decreto. */
  gradoPrensa2017?: string;
  edad?: number;
  localidad?: string;
  provincia?: string;
  /** true si la provincia se asignó a partir de una localidad inequívoca. */
  provinciaInferida?: boolean;
  funcion?: string;
  fuentesPerfil: string[];
}

export interface SearchFact {
  id: string;
  valor: number;
  unidad: string;
  label: string;
  periodo: string;
  certainty: Certainty;
  sourceIds: string[];
  nota?: string;
}

export interface Grid {
  source: string;
  note: string;
  lats: number[];
  lons: number[];
  rows: number;
  cols: number;
  elevation: number[];
}

/** Estructura de altura conocida, usada sólo como referencia de escala. */
export interface Landmark {
  id: string;
  nombre: string;
  /** Altura total publicada (m). Es el único dato que se usa: la forma 3D es esquemática. */
  alturaM: number;
  /** Lado de la base (m), si está publicado. */
  baseM?: number;
  forma: 'obelisco' | 'torre' | 'rascacielos';
  sourceIds: string[];
}

/** Nodo del trazado del viaje. Sólo los nodos con `esquematico: false` son lugares documentados. */
export interface RouteNode {
  id: string;
  lat: number;
  lon: number;
  esquematico: boolean;
  label?: string;
  /** Fecha documentada en ese lugar (texto para mostrar). */
  fecha?: string;
  sourceIds?: string[];
}

/** Pieza de evidencia documental mostrada en un momento del relato. */
export interface EvidenceItem {
  id: string;
  beatId: string;
  tipo: 'documento' | 'imagen' | 'audio';
  titulo: string;
  fecha: string;
  /** Texto literal del documento (entre comillas en la fuente). */
  texto?: string;
  /** Ruta dentro de public/. */
  archivo?: string;
  credito?: string;
  sourceIds: string[];
  nota?: string;
}
