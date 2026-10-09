import retratos from './generated/retratos44.json';

/**
 * Retratos oficiales de los 44 (memorial «44 Presentes», MinDef y Armada, vía archivo web).
 * Cada archivo public/tripulantes/NN.jpg corresponde al orden NN del Decreto 212/2020;
 * la correspondencia con el memorial se generó y cotejó con scripts/fetch_retratos.py.
 */
interface Retrato {
  orden: number;
  nombreDecreto: string;
  archivoMemorial: string;
  nombreMemorial: string;
  gradoMemorial: string;
}

const byOrden = new Map((retratos as Retrato[]).map((r) => [r.orden, r]));

/** URL del retrato o null si no hay uno verificado. */
export function portraitUrl(orden: number): string | null {
  return byOrden.has(orden) ? `${import.meta.env.BASE_URL}tripulantes/${String(orden).padStart(2, '0')}.jpg` : null;
}
