const EARTH_RADIUS_KM = 6371.0088;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Distancia ortodrómica (haversine) en km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Grados, minutos, segundos (hemisferio sur/oeste negativos). */
export function dms(deg: number, min: number, sec = 0, negative = true): number {
  const v = deg + min / 60 + sec / 3600;
  return negative ? -v : v;
}
