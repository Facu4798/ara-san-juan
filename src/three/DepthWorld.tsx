import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { GeoData } from '../utils/loadData';
import { depthMarkers, WRECK_DEPTH_M, SUBMARINE, DEBRIS_FIELD_M } from '../data/depth';
import { landmarkById } from '../data/landmarks';
import { descentDepth } from '../story/descent';
import { localPoint } from './geoFrame';
import { gridMesh, gridContours, ramp } from './terrain';
import { Water, Sky } from './Water';
import { Memorial } from './Memorial';
import { Landmarks } from './Landmarks';
import { SubmarineModel } from './SubmarineModel';
import { Label } from './Label';
import { cached } from './map/mapParts';

/**
 * MUNDO DE PROFUNDIDAD (1 unidad = 1 m, escala real en las tres dimensiones).
 * Centrado en la coordenada publicada del hallazgo. El fondo es la batimetría GEBCO 2020
 * del sitio (celdas de ~460 m: no resuelve el cañón a escala del submarino).
 */
const seabedColor = ramp([
  [-1250, '#162a33'],
  [-950, '#21404c'],
  [-800, '#355a68'],
  [-650, '#4b707d'],
]);

const smooth = (t: number) => t * t * (3 - 2 * t);
const seg = (p: number, a: number, b: number) => smooth(Math.min(1, Math.max(0, (p - a) / (b - a))));

/** Planos horizontales en las profundidades documentadas: referencias al pasar. */
function DepthPlanes({ visible }: { visible: boolean }) {
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
          opacity={0.28}
          dashed={m.certainty !== 'hecho'}
          dashSize={10}
          gapSize={8}
        />
      ))}
    </>
  );
}

/** Marca del hallazgo, contorno del campo de restos y silueta de escala. */
export function WreckSite({ labels, scaleLabel }: { labels: boolean; scaleLabel: boolean }) {
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
      <group position={[0, SUBMARINE.cascoResistenteAnchoM / 2 + 1, b + 22]}>
        <SubmarineModel ghost />
      </group>
      <Label position={[a + 6, 10, 0]} tone="hecho" show={labels}>
        <strong>Restos · 907 m</strong>
        <br />
        campo de {DEBRIS_FIELD_M.a} × {DEBRIS_FIELD_M.b} m
      </Label>
      <Label position={[0, 14, b + 22]} tone="referencia" align="center" show={labels && scaleLabel}>silueta de escala, no posición</Label>
    </group>
  );
}

/** Fondo del sitio (GEBCO 2020, escala real) con isóbatas cada 25 m. */
export function Seabed({ geo }: { geo: GeoData }) {
  const seabed = cached(geo.wreckLocal, 'seabed', () => gridMesh(geo.wreckLocal, localPoint, seabedColor));
  const isobaths = cached(geo.wreckLocal, 'seabed-iso', () => gridContours(geo.wreckLocal, Array.from({ length: 20 }, (_, i) => -1200 + i * 25), localPoint, 1.5));
  return (
    <>
      <mesh geometry={seabed}>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} flatShading />
      </mesh>
      <lineSegments geometry={isobaths}>
        <lineBasicMaterial color="#7cc4d8" transparent opacity={0.4} />
      </lineSegments>
    </>
  );
}

export function DepthWorld({ geo, beatId, p, active }: { geo: GeoData; beatId: string; p: number; active: boolean }) {

  const surfaceBeat = beatId === 'memorial' || beatId === 'cierre';
  const depth = beatId === 'descenso' ? descentDepth(p) : beatId === 'hallazgo' ? WRECK_DEPTH_M : 0;
  const comparison = beatId === 'descenso' && p < 0.3;
  const comparisonOpacity = beatId === 'descenso' ? 1 - seg(p, 0.18, 0.3) : 0;
  const obel = landmarkById.get('obelisco')!;
  const memorialOpacity = beatId === 'memorial' ? 1 : beatId === 'cierre' ? seg(p, 0, 0.35) : 0;

  return (
    <group>
      {surfaceBeat && <Sky />}
      <Water />
      {memorialOpacity > 0 && <Memorial opacity={memorialOpacity} />}

      {/* Comparación en superficie: el submarino (65,93 m) y el Obelisco (67,5 m) acostado. */}
      {comparison && (
        <group>
          <group position={[-2, -9, 0]}>
            <SubmarineModel opacity={comparisonOpacity} />
          </group>
          <group position={[-obel.alturaM / 2 - 2, -24, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <mesh position={[0, obel.alturaM / 2, 0]}>
              <boxGeometry args={[obel.baseM ?? 6.8, obel.alturaM, obel.baseM ?? 6.8]} />
              <meshBasicMaterial color="#d7e9ef" wireframe transparent opacity={0.5 * comparisonOpacity} />
            </mesh>
          </group>
          <Label position={[0, -1, 0]} tone="hecho" align="center" show={active && comparisonOpacity > 0.5}>
            ARA San Juan · {String(SUBMARINE.esloraM).replace('.', ',')} m de eslora
          </Label>
          <Label position={[0, -31, 0]} tone="referencia" align="center" show={active && comparisonOpacity > 0.5}>
            Obelisco · 67,5 m (acostado, como referencia)
          </Label>
        </group>
      )}

      <DepthPlanes visible={beatId === 'descenso'} />

      <Seabed geo={geo} />

      <Label position={[260, -4, 0]} tone="referencia" show={active && beatId === 'hallazgo' && p > 0.45}>
        superficie del mar · 0 m
      </Label>

      {(beatId === 'descenso' || beatId === 'hallazgo') && (
        <>
          <Landmarks cameraDepth={depth} showAll={beatId === 'hallazgo'} labels={active} />
          <WreckSite labels={active && (beatId === 'hallazgo' || depth > 860)} scaleLabel={beatId === 'descenso'} />
        </>
      )}
    </group>
  );
}
