/**
 * PISTAS DE ANIMACIÓN. Herramientas puras para que todo movimiento sea continuo (C1):
 * una pista es una función del tiempo definida por claves, interpolada con una cúbica
 * monótona de Hermite (Fritsch–Carlson). A diferencia de Catmull-Rom clásico no se pasa de
 * los valores de las claves, así que una cámara no «rebota» entre dos tomas.
 */

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const smoother = (t: number) => {
  const x = clamp(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
/** Tramo suavizado: 0 antes de `a`, 1 después de `b`. */
export const seg = (v: number, a: number, b: number) => smooth((v - a) / (b - a));
export const segSmoother = (v: number, a: number, b: number) => smoother((v - a) / (b - a));
/** Fracción lineal (0 a 1) del tramo [a, b]. */
export const frac = (v: number, a: number, b: number) => clamp((v - a) / (b - a));

export type Key = readonly [t: number, v: number];

/** Pista de un valor escalar. Fuera de las claves se mantiene el valor del extremo. */
export function track(keys: readonly Key[]): (t: number) => number {
  const n = keys.length;
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  const d: number[] = new Array(n).fill(0);
  if (n > 1) {
    const h: number[] = [];
    const s: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      h.push(xs[i + 1] - xs[i]);
      s.push((ys[i + 1] - ys[i]) / h[i]);
    }
    d[0] = s[0];
    d[n - 1] = s[n - 2];
    for (let i = 1; i < n - 1; i++) {
      d[i] = s[i - 1] * s[i] <= 0 ? 0 : (2 * s[i - 1] * s[i]) / (s[i - 1] + s[i]);
    }
    // Fritsch–Carlson: limita las pendientes para conservar la monotonía de cada tramo.
    for (let i = 0; i < n - 1; i++) {
      if (s[i] === 0) {
        d[i] = 0;
        d[i + 1] = 0;
        continue;
      }
      const a = d[i] / s[i];
      const b = d[i + 1] / s[i];
      const r = a * a + b * b;
      if (r > 9) {
        const k = 3 / Math.sqrt(r);
        d[i] = k * a * s[i];
        d[i + 1] = k * b * s[i];
      }
    }
  }
  let last = 0;
  return (t: number) => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    // Búsqueda desde el último tramo usado: el tiempo avanza de a poco casi siempre.
    let i = last;
    if (t < xs[i] || t > xs[i + 1]) {
      i = 0;
      while (i < n - 2 && t > xs[i + 1]) i++;
    }
    last = i;
    const h = xs[i + 1] - xs[i];
    const u = (t - xs[i]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * ys[i] +
      (u3 - 2 * u2 + u) * h * d[i] +
      (-2 * u3 + 3 * u2) * ys[i + 1] +
      (u3 - u2) * h * d[i + 1]
    );
  };
}

/** Amortiguación crítica (SmoothDamp de Unity) para seguir un objetivo sin picos de velocidad. */
export interface Damp {
  v: number;
  vel: number;
}
export function smoothDamp(s: Damp, target: number, smoothTime: number, dt: number, maxSpeed = Infinity) {
  const omega = 2 / Math.max(1e-4, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = s.v - target;
  const maxChange = maxSpeed * smoothTime;
  change = clamp(change, -maxChange, maxChange);
  const tgt = s.v - change;
  const temp = (s.vel + omega * change) * dt;
  s.vel = (s.vel - omega * temp) * exp;
  let out = tgt + (change + temp) * exp;
  if (target - s.v > 0 === out > target) {
    out = target;
    s.vel = (out - target) / dt;
  }
  s.v = out;
  return out;
}

/** Ruido suave y barato (suma de senos) en [-1, 1]; determinista, sin estado. */
export function wobble(t: number, seed = 0) {
  return (
    Math.sin(t * 1.31 + seed * 7.3) * 0.5 +
    Math.sin(t * 2.27 + seed * 3.1 + 1.7) * 0.3 +
    Math.sin(t * 4.11 + seed * 5.9 + 0.4) * 0.2
  );
}
