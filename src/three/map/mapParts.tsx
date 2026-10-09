import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import type { GeoData } from '../../utils/loadData';
import type { Grid } from '../../data/types';
import { HYPOTHESIS_SPEED, referencePlaces } from '../../data/positions';
import { fmt0, fmt1 } from '../../utils/format';
import { mapPoint } from '../geoFrame';
import { gridMesh, gridContours, hypsometric } from '../terrain';
import { Label } from '../Label';

/**
 * PIEZAS DEL MAPA compartidas por la historia guiada y los módulos de exploración.
 * Las geometrías pesadas se calculan una sola vez por dataset (caché por objeto de datos),
 * así cambiar de módulo no recalcula el relieve.
 */

/** Colores con significado (iguales en toda la experiencia). */
export const C = {
  hecho: '#eaf4f8',
  estimacion: '#70bbd8',
  hipotesis: '#d5a65d',
  busqueda: '#8fb0c2',
  trazado: '#9cc0cf',
  desconocido: '#8196a5',
  alerta: '#d77a6a',
};

export const MAP_BG = '#14303e';

export const V3 = (lat: number, lon: number, y = 0) => {
  const [x, , z] = mapPoint(lat, lon);
  return new THREE.Vector3(x, y, z);
};

const cache = new WeakMap<object, Map<string, unknown>>();
/** Memoiza `make()` por objeto de datos y clave: sobrevive al desmontaje de componentes. */
export function cached<T>(owner: object, key: string, make: () => T): T {
  let m = cache.get(owner);
  if (!m) {
    m = new Map();
    cache.set(owner, m);
  }
  if (!m.has(key)) m.set(key, make());
  return m.get(key) as T;
}

/** Límites de la grilla GEBCO de plataforma: la costa no se dibuja fuera del relieve. */
const REGION = { w: -76, e: -30, s: -60, n: -21 };

/** Costa de Natural Earth como segmentos apenas por encima del agua. */
export function coastGeometry(land: Feature<Geometry> | FeatureCollection<Geometry>, region = REGION) {
  const feats = 'features' in land ? land.features : [land];
  const pts: number[] = [];
  const inside = ([lon, lat]: number[]) => lon > region.w && lon < region.e && lat > region.s && lat < region.n;
  for (const f of feats) {
    const g = f.geometry;
    const polys = g.type === 'MultiPolygon' ? (g as MultiPolygon).coordinates : g.type === 'Polygon' ? [(g as Polygon).coordinates] : [];
    for (const poly of polys) {
      for (const ring of poly) {
        for (let i = 1; i < ring.length; i++) {
          if (!inside(ring[i]) || !inside(ring[i - 1])) continue;
          const a = mapPoint(ring[i - 1][1], ring[i - 1][0]);
          const b = mapPoint(ring[i][1], ring[i][0]);
          pts.push(a[0], 0.4, a[2], b[0], 0.4, b[2]);
        }
      }
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geom;
}

/** Retícula de paralelos y meridianos cada 2° (en Mercator son rectas). */
export function graticuleGeometry() {
  const pts: number[] = [];
  const push = (a: number[], b: number[]) => pts.push(a[0], 0.3, a[2], b[0], 0.3, b[2]);
  for (let lat = -56; lat <= -22; lat += 2) push(mapPoint(lat, -76), mapPoint(lat, -40));
  for (let lon = -74; lon <= -42; lon += 2) push(mapPoint(-58, lon), mapPoint(-22, lon));
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geom;
}
const GRATICULE = graticuleGeometry();

/** Textura de rayado para la hipótesis (codificación visual de «hipótesis» en todo el proyecto). */
export function hatchTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  g.strokeStyle = 'rgba(213,166,93,0.9)';
  g.lineWidth = 3;
  for (let i = -32; i < 64; i += 10) {
    g.beginPath();
    g.moveTo(i, 32);
    g.lineTo(i + 32, 0);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function circlePoints(center: THREE.Vector3, r: number, y: number, n = 128) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push(new THREE.Vector3(center.x + Math.cos(a) * r, y, center.z + Math.sin(a) * r));
  }
  return pts;
}

/** Marca de posición: mástil + esfera + anillo sobre el agua. */
export function Pin({ at, color, height = 34, ring = 9, opacity = 1, dot = 2.6 }: { at: THREE.Vector3; color: string; height?: number; ring?: number; opacity?: number; dot?: number }) {
  return (
    <group position={[at.x, 0, at.z]}>
      <Line points={[[0, 0.5, 0], [0, height, 0]]} color={color} lineWidth={1.4} transparent opacity={opacity} />
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[dot, 16, 12]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.6, 0]}>
        <ringGeometry args={[ring, ring + ring * 0.15, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.7 * opacity} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Ondas que se expanden desde la ubicación estimada del evento acústico (abstracto). */
export function AcousticRings({ at }: { at: THREE.Vector3 }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      const k = (clock.elapsedTime * 0.28 + i / 3) % 1;
      m.scale.setScalar(4 + k * 150);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k);
    });
  });
  return (
    <group position={[at.x, 0.7, at.z]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m; }} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.97, 1, 96]} />
          <meshBasicMaterial color={C.estimacion} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Hipótesis rotulada: área alcanzable a 5 nudos en cualquier dirección (no es una posición). */
export function HypothesisDisk({ center, radiusKm, hours, label = true }: { center: THREE.Vector3; radiusKm: number; hours: number; label?: boolean }) {
  const tex = useMemo(hatchTexture, []);
  tex.repeat.set(radiusKm / 6, radiusKm / 6);
  return (
    <group>
      <mesh position={[center.x, 0.5, center.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[radiusKm, radiusKm, 1]}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial map={tex} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <Line points={circlePoints(center, radiusKm, 0.7)} color={C.hipotesis} lineWidth={1.2} dashed dashSize={5} gapSize={4} />
      <Label position={[center.x, 1, center.z + radiusKm + 12]} tone="hipotesis" align="center" show={label}>
        HIPÓTESIS · {HYPOTHESIS_SPEED.nudos} nudos × {fmt1(hours)} h = {fmt0(radiusKm)} km
      </Label>
    </group>
  );
}

/** Ciudades de referencia (cubo + rótulo). */
export function Cities({ ids, size = 6, labels = true }: { ids: string[]; size?: number; labels?: boolean }) {
  return (
    <>
      {referencePlaces
        .filter((c) => ids.includes(c.id))
        .map((c) => {
          const v = V3(c.lat, c.lon);
          return (
            <group key={c.id}>
              <mesh position={[v.x, 1.2, v.z]}>
                <boxGeometry args={[size, 2, size]} />
                <meshBasicMaterial color="#dfe8ec" />
              </mesh>
              <Label position={[v.x, 2, v.z]} tone="referencia" show={labels}>{c.label}</Label>
            </group>
          );
        })}
    </>
  );
}

/**
 * Base del mapa del Atlántico Sur: relieve GEBCO (tierra + mar, el color codifica la
 * elevación), detalle regional opcional, isóbatas, superficie translúcida, costa y retícula.
 */
export function MapBase({
  geo,
  detail = false,
  graticuleOpacity = 0.07,
  bathymetry = true,
}: {
  geo: GeoData;
  detail?: boolean;
  graticuleOpacity?: number;
  /** false: el fondo marino se muestra en un tono neutro (capa «batimetría» apagada). */
  bathymetry?: boolean;
}) {
  const terrain = cached(geo.shelf, 'terrain', () => gridMesh(geo.shelf, mapPoint, hypsometric, { cells: 9, color: MAP_BG }));
  const flat = cached(geo.shelf, 'terrain-flat', () =>
    gridMesh(geo.shelf, mapPoint, (e, out) => (e < 0 ? out.set('#2a4e60') : hypsometric(e, out)), { cells: 9, color: MAP_BG }),
  );
  const regional = cached(geo.regional, 'terrain', () => gridMesh(geo.regional, mapPoint, hypsometric));
  const shelfEdge = cached(geo.shelf, 'iso200', () => gridContours(geo.shelf, [-200], mapPoint, 0.6));
  const deepIso = cached(geo.shelf, 'isoDeep', () => gridContours(geo.shelf, [-1000, -3000], mapPoint, 0.6));
  const coast = cached(geo.land, 'coast', () => coastGeometry(geo.land));
  return (
    <group>
      <mesh geometry={bathymetry ? terrain : flat}>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>
      {bathymetry && (
        <mesh geometry={regional} visible={detail}>
          <meshStandardMaterial vertexColors roughness={0.95} metalness={0} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-4} />
        </mesh>
      )}
      {bathymetry && (
        <>
          <lineSegments geometry={shelfEdge}>
            <lineBasicMaterial color="#bfe3ee" transparent opacity={0.45} />
          </lineSegments>
          <lineSegments geometry={deepIso}>
            <lineBasicMaterial color="#9fcfdf" transparent opacity={0.18} />
          </lineSegments>
        </>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[9000, 9000]} />
        <meshStandardMaterial color="#2b6479" transparent opacity={0.3} depthWrite={false} roughness={0.35} metalness={0.1} />
      </mesh>
      <lineSegments geometry={coast}>
        <lineBasicMaterial color="#e9f1f3" transparent opacity={0.6} />
      </lineSegments>
      <lineSegments geometry={GRATICULE}>
        <lineBasicMaterial color="#dbe8ec" transparent opacity={graticuleOpacity} />
      </lineSegments>
    </group>
  );
}

/** Relieve de una grilla con el mismo tratamiento (útil para otras grillas). */
export function gridTerrain(g: Grid) {
  return cached(g, 'terrain', () => gridMesh(g, mapPoint, hypsometric, { cells: 6, color: MAP_BG }));
}
