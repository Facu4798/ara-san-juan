import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { GeoData } from '../utils/loadData';
import { depthMarkers, WRECK_DEPTH_M, SUBMARINE, DEBRIS_FIELD_M } from '../data/depth';
import { localPoint } from './geoFrame';
import { gridMesh, gridContours, ramp } from './terrain';
import { SubmarineModel } from './SubmarineModel';
import { Label } from './Label';
import { cached } from './map/mapParts';

/**
 * PIEZAS DEL SITIO DEL HALLAZGO (1 unidad = 1 m, escala real en las tres dimensiones),
 * centradas en la coordenada publicada. El fondo es la batimetría GEBCO 2020 del sitio
 * (celdas de ~440 m: no resuelve el cañón a escala del submarino).
 * En el viaje continuo este grupo se coloca sobre el mapa a escala 0,001 (m → km).
 */
const seabedColor = ramp([
  [-1250, '#162a33'],
  [-950, '#21404c'],
  [-800, '#355a68'],
  [-650, '#4b707d'],
]);

/** Planos horizontales en las profundidades documentadas: referencias al pasar. */
export function DepthPlanes({ visible, opacity = 0.28 }: { visible: boolean; opacity?: number }) {
  const loops = useMemo(
    () =>
      depthMarkers
        .filter((m) => m.depthM < WRECK_DEPTH_M)
        .map((m) => {
          const s = 420;
          return {
            m,
            pts: [[-s, -m.depthM, -s], [s, -m.depthM, -s], [s, -m.depthM, s], [-s, -m.depthM, s], [-s, -m.depthM, -s]] as [number, number, number][],
          };
        }),
    [],
  );
  if (!visible) return null;
  return (
    <>
      {loops.map(({ m, pts }) => (
        <Line
          key={m.depthM}
          points={pts}
          color={m.certainty === 'hecho' ? '#f1efe8' : '#7cc4d8'}
          lineWidth={1}
          transparent
          opacity={opacity}
          dashed={m.certainty !== 'hecho'}
          dashSize={10}
          gapSize={8}
        />
      ))}
    </>
  );
}

/** Marca del hallazgo, contorno del campo de restos y silueta de escala. */
export function WreckSite({ labels, scaleLabel, silhouette = true }: { labels: boolean; scaleLabel: boolean; silhouette?: boolean }) {
  const a = DEBRIS_FIELD_M.a / 2, b = DEBRIS_FIELD_M.b / 2;
  const y = 1.5;
  return (
    <group position={[0, -WRECK_DEPTH_M, 0]}>
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[2.4, 16, 12]} />
        <meshBasicMaterial color="#f1efe8" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.2, 0]}>
        <ringGeometry args={[14, 15.5, 48]} />
        <meshBasicMaterial color="#f1efe8" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* 80 × 100 m: tamaño publicado; la orientación NO se publicó (se dibuja alineado norte-sur). */}
      <Line points={[[-a, y, -b], [a, y, -b], [a, y, b], [-a, y, b], [-a, y, -b]]} color="#f1efe8" lineWidth={1.2} dashed dashSize={4} gapSize={3} transparent opacity={0.75} />
      {silhouette && (
        <group position={[0, SUBMARINE.cascoResistenteAnchoM / 2 + 1, b + 22]}>
          <SubmarineModel ghost />
        </group>
      )}
      <Label position={[a + 6, 10, 0]} tone="hecho" show={labels}>
        <strong>Restos · 907 m</strong>
        <br />
        campo de {DEBRIS_FIELD_M.a} × {DEBRIS_FIELD_M.b} m
      </Label>
      <Label position={[0, 14, b + 22]} tone="referencia" align="center" show={labels && scaleLabel && silhouette}>silueta de escala, no posición</Label>
    </group>
  );
}

/** Fondo del sitio (GEBCO 2020, escala real) con isóbatas cada 25 m. */
export function Seabed({ geo, flat = true }: { geo: GeoData; flat?: boolean }) {
  const seabed = cached(geo.wreckLocal, 'seabed', () => gridMesh(geo.wreckLocal, localPoint, seabedColor));
  const isobaths = cached(geo.wreckLocal, 'seabed-iso', () => gridContours(geo.wreckLocal, Array.from({ length: 20 }, (_, i) => -1200 + i * 25), localPoint, 1.5));
  return (
    <>
      <mesh geometry={seabed}>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} flatShading={flat} />
      </mesh>
      <lineSegments geometry={isobaths}>
        <lineBasicMaterial color="#7cc4d8" transparent opacity={0.4} />
      </lineSegments>
    </>
  );
}
