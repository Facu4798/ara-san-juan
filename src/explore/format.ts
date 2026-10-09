/** Formatos de fecha y hora en hora oficial argentina. */
const TZ = 'America/Argentina/Buenos_Aires';
const dDate = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const dTime = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });

export const fmtDay = (t: number | string) => dDate.format(new Date(t));
export const fmtHour = (t: number | string) => dTime.format(new Date(t));

/** Fecha con la precisión que tiene el dato (nunca se inventa una hora). */
export function fmtWhen(iso: string, precision: 'minuto' | 'dia' | 'aproximada') {
  if (precision === 'minuto') return `${fmtDay(iso)} · ${fmtHour(iso)}`;
  if (precision === 'aproximada') return `${fmtDay(iso)} (aprox.)`;
  return fmtDay(iso);
}
