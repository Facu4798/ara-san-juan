/**
 * Presión hidrostática aproximada. Es un CÁLCULO, no una medición:
 * P = P_atm + ρ·g·h, con densidad constante del agua de mar ρ = 1027 kg/m³
 * y g = 9,80665 m/s². Ignora la compresibilidad y la variación de ρ con
 * temperatura y salinidad (error < 1 % en los primeros 1000 m).
 */
export const SEAWATER_DENSITY = 1027;
export const G = 9.80665;
export const ATM_PA = 101325;

export function absolutePressureAtm(depthM: number): number {
  return 1 + (SEAWATER_DENSITY * G * Math.max(0, depthM)) / ATM_PA;
}

/** Fuerza sobre 1 cm² expresada en kilogramos-fuerza (intuición de escala). */
export function kgfPerCm2(depthM: number): number {
  const gaugePa = SEAWATER_DENSITY * G * Math.max(0, depthM);
  return gaugePa / 1e4 / G;
}
