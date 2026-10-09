const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export const fmt0 = (n: number) => nf0.format(n);
export const fmt1 = (n: number) => nf1.format(n);

export const CERTAINTY_LABEL = {
  hecho: 'Confirmado',
  estimacion: 'Estimado',
  hipotesis: 'Reconstrucción',
  desconocido: 'No determinado',
} as const;

/** Ícono de cada categoría: la certeza nunca se comunica sólo con color. */
export const CERTAINTY_ICON = {
  hecho: '✓',
  estimacion: '≈',
  hipotesis: '◇',
  desconocido: '?',
} as const;
