const EARTH_RADIUS_KM = 6371.0088;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Distancia ortodrómica (haversine) en km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Rumbo inicial de a hacia b, en grados (0 = norte). */
export function bearingDeg(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Grados, minutos, segundos (hemisferio sur/oeste negativos). */
export function dms(deg: number, min: number, sec = 0, negative = true): number {
  const v = deg + min / 60 + sec / 3600;
  return negative ? -v : v;
}

export function formatLat(lat: number): string {
  return formatDM(Math.abs(lat)) + (lat < 0 ? ' S' : ' N');
}

export function formatLon(lon: number): string {
  return formatDM(Math.abs(lon)) + (lon < 0 ? ' O' : ' E');
}

function formatDM(v: number): string {
  const d = Math.floor(v);
  const m = (v - d) * 60;
  return `${d}°${m.toFixed(1).replace('.', ',')}′`;
}

export const NM_PER_KM = 1 / 1.852;
