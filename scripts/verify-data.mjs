/**
 * Verificación de datos: comprueba que lo que la experiencia muestra sea consistente con
 * las fuentes registradas. Carga los módulos reales de src/ con Vite (sin duplicar datos).
 *
 * Uso:  npm run verify
 *
 * Comprueba:
 *  - que toda fuente citada (guion, evidencia, alturas, posiciones, tripulantes, carril) exista;
 *  - las distancias calculadas (91,4 / 20,0 / 76,2 km, Mar del Plata ≈ 994 km);
 *  - que el guion dure entre 60 y 70 s;
 *  - que cada tramo del trazado esquemático quede en el mar (salvo los últimos km a puerto);
 *  - la costa más cercana a la coordenada de las 00:28 (Natural Earth 1:50m);
 *  - que existan los 44 retratos, que coincidan con la nómina y los archivos de evidencia.
 */
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
const load = (p) => server.ssrLoadModule(p);

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) fails++;
};

try {
  const { sourceById } = await load('/src/data/sources.ts');
  const { beats, TOTAL_SECONDS } = await load('/src/story/beats.ts');
  const { evidence } = await load('/src/data/evidence.ts');
  const { LANDMARKS } = await load('/src/data/landmarks.ts');
  const { allPositions, COAST_NEAREST_0028, POS_0028 } = await load('/src/data/positions.ts');
  const { crew } = await load('/src/data/crew.ts');
  const { events } = await load('/src/data/events.ts');
  const { RAIL_MARKS } = await load('/src/story/descent.ts');
  const { DIST } = await load('/src/data/distances.ts');
  const { ROUTE_OUT, ROUTE_BACK } = await load('/src/data/route.ts');
  const { discrepancies } = await load('/src/data/discrepancies.ts');
  const { distanceKm } = await load('/src/utils/geo.ts');
  const { PROFILES } = await load('/src/explore/vidas/crewModel.ts');
  const { SUB_PARTS, UNPLACED, SUB_SPECS } = await load('/src/explore/travesia/subParts.ts');
  const { COMPARISONS } = await load('/src/explore/profundidad/depthModel.ts');
  const { metricsAt, daysSince, T_HALLAZGO } = await load('/src/explore/busqueda/busquedaModel.ts');
  const { DAYS_TO_FIND } = await load('/src/data/search.ts');
  const { hypothesisAt, T_1051, TRAVESIA_EVENTS } = await load('/src/explore/travesia/travesiaModel.ts');
  const { VESSEL } = await load('/src/explore/busqueda/busquedaModel.ts');
  const { WRECK_DEPTH_M } = await load('/src/data/depth.ts');
  const { absolutePressureAtm } = await load('/src/utils/physics.ts');

  // ——— Fuentes citadas ———
  const cited = new Map();
  const cite = (ids, where) => ids.forEach((id) => cited.set(id, [...(cited.get(id) ?? []), where]));
  beats.forEach((b) => cite(b.sourceIds, `momento ${b.id}`));
  evidence.forEach((e) => cite(e.sourceIds, `evidencia ${e.id}`));
  LANDMARKS.forEach((l) => cite(l.sourceIds, `altura ${l.id}`));
  allPositions.forEach((p) => cite(p.sourceIds, `posición ${p.id}`));
  crew.forEach((c) => cite(c.fuentesPerfil, `tripulante ${c.orden}`));
  events.forEach((e) => cite(e.sourceIds, `evento ${e.id}`));
  RAIL_MARKS.forEach((m) => cite(m.sourceIds, `carril ${m.depthM} m`));
  discrepancies.forEach((d) => cite(d.valores.map((v) => v.sourceId), `diferencia «${d.dato}»`));
  PROFILES.forEach((p) => cite(p.fuentes, `perfil ${p.orden}`));
  SUB_PARTS.forEach((pt) => pt.datos.forEach((d) => cite(d.sourceIds, `parte ${pt.id}`)));
  UNPLACED.forEach((u) => cite(u.sourceIds, `componente ${u.nombre}`));
  SUB_SPECS.forEach((u) => cite(u.sourceIds, `ficha ${u.k}`));
  COMPARISONS.forEach((c) => cite(c.sourceIds, `comparación ${c.id}`));
  metricsAt(Date.parse('2018-11-30T00:00:00-03:00')).forEach((m) => cite(m.sourceIds, `métrica ${m.id}`));
  const missing = [...cited.keys()].filter((id) => !sourceById.has(id));
  ok(missing.length === 0, `todas las fuentes citadas existen (${cited.size} ids)${missing.length ? ': faltan ' + missing.join(', ') : ''}`);

  // ——— Distancias ———
  const near = (v, target, tol) => Math.abs(v - target) <= tol;
  ok(near(DIST.wreck, 91.4, 0.1), `00:28 → hallazgo = ${DIST.wreck.toFixed(1)} km (esperado 91,4)`);
  ok(near(DIST.wreckCtbto, 20.0, 0.1), `CTBTO → hallazgo = ${DIST.wreckCtbto.toFixed(1)} km (esperado 20,0)`);
  ok(near(DIST.ctbto, 76.2, 0.1), `00:28 → CTBTO = ${DIST.ctbto.toFixed(1)} km (esperado 76,2)`);
  ok(near(DIST.mdp, 994, 1.5), `00:28 → Mar del Plata = ${DIST.mdp.toFixed(1)} km (esperado ≈ 994)`);

  // ——— Duración ———
  ok(TOTAL_SECONDS >= 60 && TOTAL_SECONDS <= 70, `el guion dura ${TOTAL_SECONDS} s (entre 60 y 70)`);

  // ——— Costa (Natural Earth) ———
  const topo = JSON.parse(fs.readFileSync(path.join(root, 'public/data/land-50m.json'), 'utf8'));
  const land = feature(topo, topo.objects.land);
  const polys = [];
  for (const f of land.features) for (const p of f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]) polys.push(p);
  const inRing = (pt, ring) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const onLand = (lon, lat) => polys.some((p) => inRing([lon, lat], p[0]) && !p.slice(1).some((h) => inRing([lon, lat], h)));

  let best = { km: Infinity };
  for (const p of polys) for (const ring of p) for (let i = 1; i < ring.length; i++) {
    const [a, b] = [ring[i - 1], ring[i]];
    if (Math.abs(a[1] - POS_0028.lat) > 6 || Math.abs(a[0] - POS_0028.lon) > 12) continue;
    for (let s = 0; s <= 10; s++) {
      const q = { lon: a[0] + ((b[0] - a[0]) * s) / 10, lat: a[1] + ((b[1] - a[1]) * s) / 10 };
      const km = distanceKm(POS_0028, q);
      if (km < best.km) best = { km, ...q };
    }
  }
  ok(near(best.km, COAST_NEAREST_0028.km, 1) && near(best.lat, COAST_NEAREST_0028.lat, 0.01) && near(best.lon, COAST_NEAREST_0028.lon, 0.01),
    `costa más cercana a las 00:28: ${best.km.toFixed(1)} km en ${best.lat.toFixed(3)}, ${best.lon.toFixed(3)} (registrado ${COAST_NEAREST_0028.km} km)`);

  // ——— Trazado esquemático en el mar ———
  for (const [name, route] of [['ida', ROUTE_OUT], ['vuelta', ROUTE_BACK]]) {
    const ports = [route[0], route[route.length - 1]];
    let bad = null;
    for (let i = 1; i < route.length && !bad; i++) {
      const [a, b] = [route[i - 1], route[i]];
      for (let s = 0; s <= 40; s++) {
        const q = { lat: a.lat + ((b.lat - a.lat) * s) / 40, lon: a.lon + ((b.lon - a.lon) * s) / 40 };
        if (ports.some((pt) => !pt.esquematico && distanceKm(pt, q) < 5)) continue; // llegada a puerto
        if (onLand(q.lon, q.lat)) { bad = `${q.lat.toFixed(3)}, ${q.lon.toFixed(3)}`; break; }
      }
    }
    ok(!bad, `trazado esquemático (${name}) en el mar${bad ? ': cruza tierra en ' + bad : ''}`);
  }

  // ——— Módulo 1: nacimientos, edades y provincias ———
  const prov = JSON.parse(fs.readFileSync(path.join(root, 'public/data/provincias-ar.json'), 'utf8')).features;
  const provOf = (lon, lat) => prov.find((f) => f.geometry.coordinates.some((poly) => inRing([lon, lat], poly[0]) && !poly.slice(1).some((h) => inRing([lon, lat], h))))?.properties.nombre;
  const wrongProv = PROFILES.filter((p) => provOf(p.nacimiento.lon, p.nacimiento.lat) !== p.nacimiento.provincia);
  ok(wrongProv.length === 0, `cada lugar de nacimiento cae dentro de su provincia (IGN)${wrongProv.length ? ': revisar ' + wrongProv.map((p) => `${p.orden} ${p.nacimiento.localidad} → ${provOf(p.nacimiento.lon, p.nacimiento.lat)}`).join('; ') : ''}`);
  const badAge = PROFILES.filter((p) => {
    const [y, m, d] = p.nacimiento.fecha.split('-').map(Number);
    const age = 2017 - y - (11 < m || (m === 11 && 15 < d) ? 1 : 0);
    return age !== p.edad;
  });
  ok(PROFILES.length === 44 && badAge.length === 0 && PROFILES.every((p) => p.bio.length > 0), `44 perfiles con biografía y edad al 15/11/2017 coherente con la fecha oficial${badAge.length ? ': revisar ' + badAge.map((p) => p.orden).join(', ') : ''}`);
  ok(PROFILES.filter((p) => p.sexo === 'mujer').length === 1, 'una sola mujer en la tripulación, como informa la Armada');
  ok(daysSince(T_HALLAZGO) === DAYS_TO_FIND, `la búsqueda cuenta ${daysSince(T_HALLAZGO)} días al hallazgo (esperado ${DAYS_TO_FIND})`);

  // ——— Hallazgos que se afirman en los paneles de exploración ———
  const alcance = hypothesisAt(T_1051);
  ok(alcance.km > DIST.wreck, `el hallazgo (${DIST.wreck.toFixed(1)} km) queda dentro del alcance a 5 nudos hasta las 10:51 (${alcance.km.toFixed(1)} km)`);
  const conPos = TRAVESIA_EVENTS.filter((e) => e.positionId).length;
  ok(conPos > 0 && conPos < TRAVESIA_EVENTS.length, `${conPos} de ${TRAVESIA_EVENTS.length} acontecimientos de la travesía tienen lugar publicado`);
  ok(VESSEL.length === 19 && daysSince(VESSEL[0].t) === 298, `${VESSEL.length} posiciones del buque; la primera es del día ${daysSince(VESSEL[0].t)} (esperado 19 y 298)`);
  ok(VESSEL.every((v) => v.t >= Date.parse('2018-01-01T00:00:00-03:00')), 'ninguna posición publicada de búsqueda es de 2017');
  const sinDatos = (WRECK_DEPTH_M - 100) / WRECK_DEPTH_M;
  ok(Math.round(sinDatos * 100) === 89, `la franja sin datos (100 → ${WRECK_DEPTH_M} m) es el ${Math.round(sinDatos * 100)} % de la columna (esperado 89)`);
  ok(near(absolutePressureAtm(WRECK_DEPTH_M), 91.2, 0.1), `presión estimada a ${WRECK_DEPTH_M} m = ${absolutePressureAtm(WRECK_DEPTH_M).toFixed(1)} atm (esperado 91,2)`);

  // ——— Retratos y evidencia ———
  const retratos = JSON.parse(fs.readFileSync(path.join(root, 'src/data/generated/retratos44.json'), 'utf8'));
  const norm = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const mismatched = crew.filter((c) => {
    const r = retratos.find((x) => x.orden === c.orden);
    return !r || norm(r.nombreMemorial) !== norm(c.nombreCompleto) || !fs.existsSync(path.join(root, 'public/tripulantes', `${String(c.orden).padStart(2, '0')}.jpg`));
  });
  ok(crew.length === 44 && mismatched.length === 0, `44 retratos presentes y cotejados con la nómina${mismatched.length ? ': revisar ' + mismatched.map((c) => c.orden).join(', ') : ''}`);
  const missingFiles = evidence.filter((e) => e.archivo && !fs.existsSync(path.join(root, 'public', e.archivo)));
  ok(missingFiles.length === 0, `archivos de evidencia presentes${missingFiles.length ? ': faltan ' + missingFiles.map((e) => e.archivo).join(', ') : ''}`);
} finally {
  await server.close();
}

console.log(fails ? `\n${fails} verificación(es) fallaron.` : '\nTodo verificado.');
process.exit(fails ? 1 : 0);
