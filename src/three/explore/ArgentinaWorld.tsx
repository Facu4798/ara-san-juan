import { useMemo, useState } from 'react';
import { Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { GeoData, ExploreData, ProvinceFeature } from '../../utils/loadData';
import type { Grid } from '../../data/types';
import { useApp, setApp, setFilters } from '../../app/appStore';
import { PLACES, matches, type PlaceGroup } from '../../explore/vidas/crewModel';
import { mapPoint, elevToMapY } from '../geoFrame';
import { gridMesh, hypsometric, ramp, sampleGrid } from '../terrain';
import { cached, MAP_BG, C } from '../map/mapParts';
import { Label } from '../Label';

/**
 * MÓDULO 1 · Mapa 3D de Argentina con la procedencia de los 44.
 *
 * - Relieve GEBCO 2020 (tierra ×8, mar ×25). Argentina se distingue de los países vecinos
 *   con una máscara calculada a partir de los límites oficiales del IGN (no a ojo).
 * - Límites provinciales del IGN apoyados sobre el relieve.
 * - Una columna por lugar de nacimiento (coordenada oficial Georef). Su altura es proporcional
 *   a la cantidad de personas que nacieron allí. Las ubicaciones no exactas (ambiguas,
 *   aproximadas o departamentales) se dibujan huecas y se advierten en la ficha.
 */

/** Gris apagado para los países vecinos: contexto, no protagonista. */
const neighbor = ramp([
  [0, '#323d44'],
  [1500, '#3d474d'],
  [4500, '#5b6468'],
]);

/** Argentina: tonos tierra apagados, más claros con la altura (Andes). */
const argLand = ramp([
  [0, '#6f7a68'],
  [400, '#7e8470'],
  [1500, '#988f78'],
  [3500, '#a59e8e'],
  [6000, '#cdcfca'],
]);

/** Máscara de Argentina en la resolución de la grilla: se rasteriza el polígono oficial. */
function argentinaMask(g: Grid, provincias: ProvinceFeature[]) {
  const canvas = document.createElement('canvas');
  canvas.width = g.cols;
  canvas.height = g.rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const dLat = g.lats[1] - g.lats[0];
  const dLon = g.lons[1] - g.lons[0];
  ctx.fillStyle = '#fff';
  for (const f of provincias) {
    for (const poly of f.geometry.coordinates) {
      ctx.beginPath();
      for (const ring of poly) {
        ring.forEach(([lon, lat], i) => {
          const x = (lon - g.lons[0]) / dLon + 0.5;
          const y = (lat - g.lats[0]) / dLat + 0.5;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
      }
      ctx.fill('evenodd');
    }
  }
  const px = ctx.getImageData(0, 0, g.cols, g.rows).data;
  return (row: number, col: number) => px[(row * g.cols + col) * 4 + 3] > 96;
}

function terrainFor(g: Grid, provincias: ProvinceFeature[]) {
  const inArg = argentinaMask(g, provincias);
  return gridMesh(g, mapPoint, (e, out, r, c) => {
    if (e < 0) return hypsometric(e, out);
    return inArg(r, c) ? argLand(e, out) : neighbor(e, out);
  }, { cells: 6, color: MAP_BG });
}

/** Densifica y apoya una línea sobre el relieve. */
function drape(g: Grid, ring: number[][], step = 0.06): number[] {
  const out: number[] = [];
  const h = (lat: number, lon: number) => Math.max(0.5, elevToMapY(Math.max(0, sampleGrid(g, lat, lon))) + 0.6);
  for (let i = 1; i < ring.length; i++) {
    const [lo0, la0] = ring[i - 1];
    const [lo1, la1] = ring[i];
    const n = Math.max(1, Math.ceil(Math.hypot(lo1 - lo0, la1 - la0) / step));
    for (let k = 0; k < n; k++) {
      const a = k / n, b = (k + 1) / n;
      const p0 = mapPoint(la0 + (la1 - la0) * a, lo0 + (lo1 - lo0) * a);
      const p1 = mapPoint(la0 + (la1 - la0) * b, lo0 + (lo1 - lo0) * b);
      out.push(p0[0], h(la0 + (la1 - la0) * a, lo0 + (lo1 - lo0) * a), p0[2], p1[0], h(la0 + (la1 - la0) * b, lo0 + (lo1 - lo0) * b), p1[2]);
    }
  }
  return out;
}

function bordersFor(g: Grid, provincias: ProvinceFeature[]) {
  const pts: number[] = [];
  for (const f of provincias) for (const poly of f.geometry.coordinates) for (const ring of poly) pts.push(...drape(g, ring, 0.08));
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geom;
}

/** Contorno apoyado de una provincia, como lista de puntos por anillo (para resaltarla). */
function outlineFor(g: Grid, f: ProvinceFeature): THREE.Vector3[][] {
  return f.geometry.coordinates.map((poly) => {
    const seg = drape(g, poly[0], 0.08);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < seg.length; i += 6) pts.push(new THREE.Vector3(seg[i], seg[i + 1] + 0.4, seg[i + 2]));
    if (seg.length) pts.push(new THREE.Vector3(seg[seg.length - 3], seg[seg.length - 2] + 0.4, seg[seg.length - 1]));
    return pts;
  });
}

/** Superficie plana e invisible por provincia: sirve para seleccionarla con el puntero. */
function pickShape(f: ProvinceFeature) {
  const shapes = f.geometry.coordinates.map((poly) => {
    const toV = ([lon, lat]: number[]) => {
      const [x, , z] = mapPoint(lat, lon);
      return new THREE.Vector2(x, -z);
    };
    const shape = new THREE.Shape(poly[0].map(toV));
    poly.slice(1).forEach((h) => shape.holes.push(new THREE.Path(h.map(toV))));
    return shape;
  });
  return new THREE.ShapeGeometry(shapes).rotateX(-Math.PI / 2);
}

/** Centro y tamaño (km) de una provincia en el plano del mapa: para encuadrarla con la cámara. */
export function provinceFrame(f: ProvinceFeature) {
  const box = new THREE.Box3();
  for (const poly of f.geometry.coordinates) for (const [lon, lat] of poly[0]) box.expandByPoint(new THREE.Vector3(...mapPoint(lat, lon)));
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return { center, size: Math.max(size.x, size.z) };
}

/**
 * Escalonado de rótulos: dentro de cada provincia, los lugares se ordenan de oeste a este y se
 * les reparte una altura extra en tres niveles. Así dos localidades vecinas no superponen sus
 * rótulos; una línea fina une cada rótulo con su columna para que no haya ambigüedad.
 */
const LABEL_LIFT: Map<string, number> = (() => {
  const LEVELS = 6;
  const STEP = 44;
  /** Dos lugares a menos de este ángulo (grados) pueden pisarse en pantalla. */
  const NEAR = 1.7;
  const used: PlaceGroup[][] = Array.from({ length: LEVELS }, () => []);
  const m = new Map<string, number>();
  const gap = (p: PlaceGroup, l: PlaceGroup[]) => Math.min(Infinity, ...l.map((q) => Math.hypot(p.lon - q.lon, p.lat - q.lat)));
  for (const p of [...PLACES].sort((a, b) => a.lon - b.lon)) {
    let level = used.findIndex((l) => gap(p, l) >= NEAR);
    // Si ningún nivel está libre, el que tenga el vecino más lejos.
    if (level < 0) level = used.reduce((best, l, i) => (gap(p, l) > gap(p, used[best]) ? i : best), 0);
    used[level].push(p);
    m.set(p.key, level * STEP);
  }
  return m;
})();

function Marker({ g, place, n, total, selected, focused, onPick }: { g: Grid; place: PlaceGroup; n: number; total: number; selected: boolean; focused: boolean; onPick: (e: ThreeEvent<MouseEvent>) => void }) {
  const [hover, setHover] = useState(false);
  const [x, , z] = mapPoint(place.lat, place.lon);
  const base = Math.max(0.5, elevToMapY(Math.max(0, sampleGrid(g, place.lat, place.lon))));
  // Altura proporcional a la cantidad de personas nacidas allí (todas, no sólo las filtradas).
  const H = 30 + total * 30;
  const hFiltered = n ? 30 + n * 30 : 0;
  const exact = place.precision === 'localidad';
  const active = n > 0;
  return (
    <group position={[x, base, z]}>
      {/* Columna total (tenue) */}
      <mesh position={[0, H / 2, 0]} onClick={onPick} onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}>
        <cylinderGeometry args={[12, 12, H, 20, 1]} />
        <meshBasicMaterial color={C.desconocido} transparent opacity={active ? 0.18 : 0.12} wireframe={!exact} depthWrite={false} />
      </mesh>
      {/* Columna de las personas que cumplen los filtros */}
      {active && (
        <mesh position={[0, hFiltered / 2, 0]}>
          <cylinderGeometry args={[8, 8, hFiltered, 20, 1]} />
          <meshBasicMaterial color={selected || hover ? '#ffffff' : C.estimacion} transparent opacity={exact ? 0.95 : 0.55} wireframe={!exact} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, 0]}>
        <ringGeometry args={[15, 18, 40]} />
        <meshBasicMaterial color={active ? C.hecho : C.desconocido} transparent opacity={active ? 0.8 : 0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {(() => {
        const show = hover || selected || (focused && active);
        // Al resaltar una provincia entera el rótulo sube a su nivel; al pasar el puntero, no.
        const lift = hover || selected ? 0 : (LABEL_LIFT.get(place.key) ?? 0);
        return (
          <>
            {show && lift > 0 && (
              <Line points={[[0, H, 0], [0, H + lift, 0]]} color={C.hecho} lineWidth={1} transparent opacity={0.35} />
            )}
            <Label position={[0, H + 4 + lift, 0]} tone={active ? 'hecho' : 'referencia'} align="center" show={show}>
              <strong>{place.localidad}</strong> · {total === 1 ? '1 persona' : `${total} personas`}
              {n !== total && <><br />{n} con los filtros actuales</>}
              {!exact && <><br /><em>ubicación {place.precision}</em></>}
            </Label>
          </>
        );
      })()}
    </group>
  );
}

export function ArgentinaWorld({ geo, data }: { geo: GeoData; data: ExploreData }) {
  const g = data.argentina ?? geo.shelf;
  const filters = useApp((s) => s.filters);
  const selectedPlace = useApp((s) => s.selectedPlace);
  const selectedCrew = useApp((s) => s.selectedCrew);
  const [hoverProv, setHoverProv] = useState<string | null>(null);

  const terrain = cached(g, 'arg-terrain', () => terrainFor(g, data.provincias));
  const borders = cached(g, 'arg-borders', () => bordersFor(g, data.provincias));
  const picks = useMemo(() => data.provincias.map((f) => ({ f, geom: cached(f, 'pick', () => pickShape(f)) })), [data.provincias]);
  const highlighted = [...new Set([...filters.provincias, ...(hoverProv ? [hoverProv] : [])])];
  const outlines = useMemo(
    () => highlighted.map((nombre) => {
      const f = data.provincias.find((p) => p.properties.nombre === nombre);
      return f ? { nombre, rings: cached(f, `outline-${g.rows}`, () => outlineFor(g, f)) } : null;
    }).filter(Boolean) as { nombre: string; rings: THREE.Vector3[][] }[],
    [highlighted.join('|'), data.provincias, g],
  );

  const counts = PLACES.map((pl) => ({ pl, n: pl.people.filter((p) => matches(p, filters)).length }));

  const toggleProvince = (nombre: string) => {
    const has = filters.provincias.includes(nombre);
    setFilters({ provincias: has ? filters.provincias.filter((p) => p !== nombre) : [...filters.provincias, nombre] });
    setApp({ focusProvince: has ? null : nombre, selectedPlace: null });
  };

  return (
    <group>
      <mesh geometry={terrain}>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>
      <lineSegments geometry={borders}>
        <lineBasicMaterial color="#eaf4f8" transparent opacity={0.32} />
      </lineSegments>

      {/* Provincias seleccionables (superficies invisibles) */}
      {picks.map(({ f, geom }) => (
        <mesh
          key={f.properties.nombre}
          geometry={geom}
          position={[0, 0.2, 0]}
          onClick={(e) => { e.stopPropagation(); toggleProvince(f.properties.nombre); }}
          onPointerOver={(e) => { e.stopPropagation(); setHoverProv(f.properties.nombre); }}
          onPointerOut={() => setHoverProv((h) => (h === f.properties.nombre ? null : h))}
        >
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {outlines.map((o) =>
        o.rings.map((r, i) =>
          r.length > 1 ? (
            <Line key={`${o.nombre}-${i}`} points={r} color={filters.provincias.includes(o.nombre) ? C.estimacion : C.hecho} lineWidth={filters.provincias.includes(o.nombre) ? 2.4 : 1.4} transparent opacity={0.95} />
          ) : null,
        ),
      )}
      {hoverProv && (() => {
        const f = data.provincias.find((p) => p.properties.nombre === hoverProv);
        if (!f) return null;
        const { center } = provinceFrame(f);
        const n = PLACES.filter((pl) => pl.provincia === hoverProv).reduce((a, pl) => a + pl.people.length, 0);
        return (
          <Label position={[center.x, 120, center.z]} tone="hecho" align="center">
            <strong>{hoverProv}</strong> · {n === 0 ? 'ningún nacimiento' : n === 1 ? '1 nacimiento' : `${n} nacimientos`}
          </Label>
        );
      })()}

      {counts.map(({ pl, n }) => (
        <Marker
          key={pl.key}
          g={g}
          place={pl}
          n={n}
          total={pl.people.length}
          selected={selectedPlace === pl.key || pl.people.some((p) => p.orden === selectedCrew)}
          focused={filters.provincias.length > 0 && filters.provincias.length <= 2 && filters.provincias.includes(pl.provincia)}
          onPick={(e) => {
            e.stopPropagation();
            const matching = pl.people.filter((p) => matches(p, filters));
            setApp({ selectedPlace: pl.key, selectedCrew: matching.length === 1 ? matching[0].orden : pl.people.length === 1 ? pl.people[0].orden : null });
          }}
        />
      ))}
    </group>
  );
}
