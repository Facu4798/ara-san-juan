/**
 * Verifica el guion del tour de 1 minuto sin abrir el navegador.
 *
 * Uso:  node scripts/check-tour.mjs   (o npm run tour)
 *
 * Comprueba:
 *  - que los segmentos de película y los bloques de Explorar sean contiguos y sumen EXACTAMENTE 60 s;
 *  - que los rangos de película caigan dentro de la película y que el cruce del segundo 50 (silencio previo
 *    y colapso) ocurra a velocidad real dentro de un segmento, para que suenen;
 *  - que las acciones estén ordenadas y dentro de [0, 60];
 *  - que cada `data-tour` que el cursor señala exista en el código fuente;
 *  - con un reloj simulado a 60 cuadros por segundo (y también salteando cuadros): el tour termina en
 *    e = 60,0, cada acción se ejecuta una sola vez y en orden, y el tiempo de la película sólo salta en los cortes.
 */
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
const load = (p) => server.ssrLoadModule(p);

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) fails++;
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(f.name)) out.push(p);
  }
  return out;
}

try {
  const S = await load('/src/tour/script.ts');
  const { TourRunner } = await load('/src/tour/runner.ts');
  const { TOTAL_SECONDS } = await load('/src/story/beats.ts');
  const { T } = await load('/src/journey/timeline.ts');

  // ——— Duración y contigüidad ———
  const film = S.FILM_SEGMENTS;
  const blocks = S.EXPLORE_BLOCKS;
  let cursor = 0;
  let contiguous = true;
  for (const s of film) {
    if (!near(s.at, cursor)) contiguous = false;
    cursor = s.at + s.dur;
  }
  ok(contiguous && near(cursor, S.EXPLORE_AT), `los ${film.length} segmentos de película son contiguos y terminan en ${S.EXPLORE_AT} s`);
  cursor = S.EXPLORE_AT;
  contiguous = true;
  for (const b of blocks) {
    if (!near(b.at, cursor)) contiguous = false;
    cursor = b.at + b.dur;
  }
  ok(contiguous, `los ${blocks.length} bloques de Explorar son contiguos desde ${S.EXPLORE_AT} s`);
  const total = film.reduce((a, s) => a + s.dur, 0) + blocks.reduce((a, b) => a + b.dur, 0);
  ok(near(total, 60, 1e-9) && S.TOUR_SECONDS === 60 && near(cursor, 60), `la suma de duraciones es exactamente ${total.toFixed(3)} s (= 60)`);

  // ——— Película ———
  ok(film.every((s) => s.film >= 0 && s.film + s.dur <= TOTAL_SECONDS), `los rangos de película están dentro de 0–${TOTAL_SECONDS} s`);
  const segCol = film.find((s) => s.film <= T.colapso - 1.0 && s.film + s.dur >= T.colapso + 0.3);
  ok(!!segCol, 'el silencio previo (50 − 0,9 s) y el colapso (50 s) caen dentro de un mismo segmento a 1×');
  const jump = Math.abs(S.filmTimeAt(S.FILM_SEGMENTS[3].at + 0.001) - S.filmTimeAt(S.FILM_SEGMENTS[3].at - 0.001));
  ok(jump > 5, 'los saltos de película ocurren sólo en los cortes (con fundido)');
  ok(S.CUTS.every((c) => S.fadeAt(c.at) === 1) && S.fadeAt(0.5) === 0 && S.fadeAt(20) === 0, 'cada corte llega a negro total y entre cortes no hay fundido');

  // ——— Acciones ———
  const cues = S.CUES;
  ok(cues.every((c, i) => i === 0 || c.at >= cues[i - 1].at), `las ${cues.length} acciones están ordenadas`);
  ok(cues.every((c) => c.at >= 0 && c.at <= 60), 'todas las acciones caen dentro de [0, 60]');
  ok(S.CAPTIONS.every((c, i) => i === 0 || near(c.from, S.CAPTIONS[i - 1].to)), 'los subtítulos son contiguos (siempre hay uno en pantalla)');
  ok(near(S.CAPTIONS[0].from, 0) && S.CAPTIONS[S.CAPTIONS.length - 1].to >= 60, 'los subtítulos cubren de 0 a 60 s');

  // ——— Controles que el cursor señala ———
  const src = walk(path.join(root, 'src'))
    .filter((f) => !f.includes(`${path.sep}tour${path.sep}`))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');
  const present = (id) => {
    if (src.includes(`data-tour="${id}"`)) return true;
    // atributos con plantilla: data-tour={`prov-${p.nombre}`}, face-, nav-, layer-
    const m = id.match(/^(prov|face|nav|layer)-/);
    return !!m && src.includes('data-tour={`' + m[1] + '-');
  };
  const missing = S.tourTargets().filter((t) => !present(t));
  ok(missing.length === 0, `todos los controles señalados existen (${S.tourTargets().length})${missing.length ? ': faltan ' + missing.join(', ') : ''}`);

  // ——— Narración (voz masculina con IA) ———
  const clips = S.VOICE_CLIPS;
  ok(clips.length > 0 && clips.every((c) => typeof c.dur === 'number' && c.dur > 0), `los ${clips.length} clips de voz tienen duración medida (scripts/build_voz.py)`);
  ok(clips.every((c) => fs.existsSync(path.join(root, 'public', 'tour', 'voz', `${c.id}.mp3`))), 'cada clip de voz tiene su archivo MP3');
  ok(clips.every((c, i) => i === 0 || c.at > clips[i - 1].at), 'los clips de voz están en orden');
  const gaps = clips.slice(1).map((c, i) => c.at - (clips[i].at + clips[i].dur));
  ok(gaps.every((g) => g >= 0.12), `ningún clip se pisa con el siguiente (hueco mínimo ${Math.min(...gaps).toFixed(2)} s)`);
  const last = clips[clips.length - 1];
  ok(last.at + last.dur <= 59.9, `la narración termina antes de los 60 s (en ${(last.at + last.dur).toFixed(2)} s)`);
  const segCol2 = film.find((f) => f.film <= T.colapso && f.film + f.dur >= T.colapso);
  const colapsoTour = segCol2.at + (T.colapso - segCol2.film);
  const quiet = [colapsoTour - 1.1, colapsoTour + 1.4];
  ok(clips.every((c) => c.at + c.dur <= quiet[0] || c.at >= quiet[1]), `ninguna frase tapa el silencio y el estruendo del colapso (${quiet[0].toFixed(1)}–${quiet[1].toFixed(1)} s)`);
  ok(clips.every((c) => !/\d/.test(c.texto)), 'los textos de voz escriben los números con letras (para que se lean bien)');
  ok(cues.filter((c) => c.kind === 'voice').length === clips.length, 'hay una acción de voz por cada clip');

  // ——— Simulación con reloj propio ———
  function simulate(frameMs, label) {
    const log = [];
    const films = [];
    let ended = false;
    const hooks = {
      film: (t) => films.push(t),
      cue: (c) => log.push(c),
      look: () => {},
      track: () => {},
      drag: () => {},
      ui: (s) => {
        if (s.ended) ended = true;
      },
    };
    const r = new TourRunner(hooks);
    let t = 0;
    let lastE = 0;
    while (t < 61000) {
      lastE = r.advance(t / 1000);
      t += frameMs;
    }
    ok(ended && near(lastE, 60), `${label}: el tour termina en e = ${lastE.toFixed(3)} s`);
    ok(log.length === cues.length && log.every((c, i) => c === cues[i]), `${label}: las ${log.length} acciones se ejecutan una sola vez y en orden`);
    let bigJumps = 0;
    for (let i = 1; i < films.length; i++) if (Math.abs(films[i] - films[i - 1]) > frameMs / 1000 * 1.01 + 1e-6) bigJumps++;
    ok(bigJumps === film.length - 1, `${label}: el tiempo de la película sólo salta en los ${film.length - 1} cortes (${bigJumps})`);
  }
  simulate(1000 / 60, 'a 60 cuadros/s');
  simulate(1000 / 12, 'a 12 cuadros/s');
  simulate(450, 'saltando cuadros (450 ms)');
} finally {
  await server.close();
}

if (fails) {
  console.error(`\n${fails} comprobación(es) fallida(s).`);
  process.exit(1);
}
console.log('\nTour verificado: 60,000 s exactos.');
