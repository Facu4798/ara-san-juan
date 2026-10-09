/**
 * Comprueba la continuidad del movimiento de la película (cámara y submarino) muestreando el
 * guion a 60 cuadros por segundo. Todo es función pura del tiempo, así que se puede medir sin
 * abrir el navegador.
 *
 * Uso:  node scripts/check-motion.mjs
 *
 * Mide, cuadro a cuadro:
 *   - giro de la dirección de mirada (grados),
 *   - cambio relativo de distancia al foco (zoom, %),
 *   - desplazamiento del foco relativo a la distancia (paneo, %),
 *   - giro del rumbo del submarino (grados) y su desplazamiento relativo a su eslora.
 * Un salto aislado (corte) aparece como un pico mucho mayor que el resto.
 */
import { createServer } from 'vite';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
const load = (p) => server.ssrLoadModule(p);

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) fails++;
};

try {
  const THREE = await load('three');
  const { cameraAt, cameraPosition, clipFor } = await load('/src/journey/camera.ts');
  const { subAt } = await load('/src/journey/subPath.ts');
  const { TOTAL_SECONDS, beats } = await load('/src/story/beats.ts');
  const { T } = await load('/src/journey/timeline.ts');

  const FPS = 60;
  const dt = 1 / FPS;
  const n = Math.round(TOTAL_SECONDS * FPS);
  const pos = new THREE.Vector3();
  const prevPos = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const prevDir = new THREE.Vector3();
  let prevFocus = null;
  let prevDist = 0;
  let prevSub = null;

  const worst = { turn: [0, 0], zoom: [0, 0], pan: [0, 0], yaw: [0, 0], sub: [0, 0] };
  const rec = (k, v, t) => {
    if (v > worst[k][0]) worst[k] = [v, t];
  };
  let nearViolations = 0;

  for (let i = 0; i <= n; i++) {
    const t = i * dt;
    const c = cameraAt(t);
    cameraPosition(c, 0, 0, 1, pos);
    dir.copy(c.focus).sub(pos).normalize();
    if (i > 0) {
      rec('turn', (Math.acos(Math.min(1, Math.max(-1, dir.dot(prevDir)))) * 180) / Math.PI, t);
      rec('zoom', Math.abs(c.dist - prevDist) / prevDist, t);
      rec('pan', c.focus.distanceTo(prevFocus) / c.dist, t);
      const s = subAt(t);
      // Un salto con el submarino invisible (opacidad ~0) no se ve: no cuenta.
      const visible = s.opacity > 0.03 && prevSub.opacity > 0.03 && s.mode !== 'oculto';
      if (visible) {
        let dyaw = Math.abs(s.yaw - prevSub.yaw);
        if (dyaw > Math.PI) dyaw = 2 * Math.PI - dyaw;
        rec('yaw', (dyaw * 180) / Math.PI, t);
        rec('sub', s.pos.distanceTo(prevSub.pos) / c.dist, t);
      }
    }
    // El casco nunca debe quedar detrás del plano cercano.
    const { near } = clipFor(c.dist);
    const s2 = subAt(t);
    if (s2.mode !== 'oculto' && pos.distanceTo(s2.pos) < near * 1.2) nearViolations++;
    prevDir.copy(dir);
    prevFocus = c.focus.clone();
    prevDist = c.dist;
    prevSub = subAt(t);
    prevPos.copy(pos);
  }

  const f = (k) => `${worst[k][0].toFixed(3)} en t=${worst[k][1].toFixed(2)} s`;
  console.log(`\nPeores cuadros (${FPS} fps, ${TOTAL_SECONDS} s):`);
  console.log(`  giro de mirada: ${f('turn')}°`);
  console.log(`  zoom:           ${f('zoom')} (relativo)`);
  console.log(`  paneo del foco: ${f('pan')} (relativo a la distancia)`);
  console.log(`  rumbo del sub:  ${f('yaw')}°`);
  console.log(`  avance del sub: ${f('sub')} (relativo a la distancia de cámara)`);
  console.log('');

  ok(worst.turn[0] < 1.2, 'la mirada gira menos de 1,2° por cuadro (sin cortes de cámara)');
  ok(worst.zoom[0] < 0.08, 'el zoom cambia menos de 8 % por cuadro');
  ok(worst.pan[0] < 0.06, 'el foco se desplaza menos de 6 % de la distancia por cuadro');
  ok(worst.yaw[0] < 2.5, 'el rumbo del submarino cambia menos de 2,5° por cuadro (≈150°/s)');
  ok(worst.sub[0] < 0.03, 'el submarino avanza menos de 3 % de la distancia de cámara por cuadro');
  ok(nearViolations === 0, 'la cámara nunca atraviesa el casco');
  ok(Math.abs(beats.reduce((a, b) => a + b.dur, 0) - TOTAL_SECONDS) < 1e-9, `la película dura ${TOTAL_SECONDS} s`);
  void T;
} finally {
  await server.close();
}

if (fails) {
  console.error(`\n${fails} comprobación(es) fallida(s).`);
  process.exit(1);
}
console.log('\nMovimiento continuo verificado.');
