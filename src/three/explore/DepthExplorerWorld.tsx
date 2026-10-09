import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { GeoData } from '../../utils/loadData';
import { useApp } from '../../app/appStore';
import { WRECK_DEPTH_M, SUBMARINE, depthMarkers } from '../../data/depth';
import { landmarkById } from '../../data/landmarks';
import { comparisonAt } from '../../explore/profundidad/depthModel';
import { Water } from '../Water';
import { Seabed, WreckSite } from '../depthParts';
import { Silhouette } from '../Landmarks';
import { SubmarineModel } from '../SubmarineModel';
import { Label } from '../Label';

/**
 * MÓDULO 4 · Descenso controlado por el usuario (escala real 1:1).
 * - Regla física vertical cada 100 m y plano de la profundidad actual.
 * - Una sola comparación por vez: la estructura se apoya a la profundidad alcanzada y su punta
 *   llega a la superficie (misma escala física que todo lo demás).
 * - El submarino a escala queda en superficie como referencia; en el fondo, su silueta.
 */

/** Punto de mira de la cámara para una profundidad. */
export function depthCameraTarget(d: number) {
  return new THREE.Vector3(140, -Math.min(d, WRECK_DEPTH_M) - 10, 0);
}

const RULER_X = -90;
const COMPARE_X = 200;

function Ruler({ depth }: { depth: number }) {
  const ticks = useMemo(() => Array.from({ length: 10 }, (_, i) => i * 100).concat([WRECK_DEPTH_M]), []);
  return (
    <group position={[RULER_X, 0, 0]}>
      <Line points={[[0, 0, 0], [0, -WRECK_DEPTH_M, 0]]} color="#eaf4f8" lineWidth={1.2} transparent opacity={0.5} />
      {ticks.map((d) => (
        <group key={d} position={[0, -d, 0]}>
          <Line points={[[-8, 0, 0], [8, 0, 0]]} color="#eaf4f8" lineWidth={1} transparent opacity={0.6} />
          <Label position={[12, 0, 0]} tone={d === WRECK_DEPTH_M ? 'hecho' : 'referencia'} show={Math.abs(d - depth) < 260}>
            {d === WRECK_DEPTH_M ? '907 m · hallazgo' : `${d} m`}
          </Label>
        </group>
      ))}
    </group>
  );
}

export function DepthExplorerWorld({ geo }: { geo: GeoData }) {
  const depth = useApp((s) => s.depth);
  const pinned = useApp((s) => s.pinComparison);
  const cmp = comparisonAt(depth, pinned);
  const lm = cmp && cmp.c.id !== 'hallazgo' ? landmarkById.get(cmp.c.id)! : null;

  return (
    <group>
      <Water />
      <Seabed geo={geo} />

      {/* Referencia de escala en superficie: el submarino a 1:1. */}
      <group position={[0, -SUBMARINE.cascoResistenteAnchoM / 2 - 1, 0]}>
        <SubmarineModel />
      </group>
      <Label position={[0, 3, 0]} tone="hecho" align="center" show={depth < 60}>
        ARA San Juan · 65,93 m de eslora (escala real)
      </Label>

      {/* Profundidades documentadas */}
      {depthMarkers
        .filter((m) => m.depthM < WRECK_DEPTH_M)
        .map((m) => (
          <Line
            key={m.depthM}
            points={[[-300, -m.depthM, -300], [300, -m.depthM, -300], [300, -m.depthM, 300], [-300, -m.depthM, 300], [-300, -m.depthM, -300]]}
            color={m.certainty === 'hecho' ? '#eaf4f8' : '#70bbd8'}
            lineWidth={1}
            transparent
            opacity={Math.abs(m.depthM - depth) < 120 ? 0.4 : 0.12}
            dashed={m.certainty !== 'hecho'}
            dashSize={10}
            gapSize={8}
          />
        ))}

      {/* Plano de la profundidad actual */}
      {depth > 0.5 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[140, -depth, 0]}>
          <ringGeometry args={[230, 236, 96]} />
          <meshBasicMaterial color="#eaf4f8" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      <Ruler depth={depth} />

      {/* Comparación activa: base a la profundidad de la estructura, punta en la superficie. */}
      {lm && cmp && (
        <group position={[COMPARE_X, -lm.alturaM, 0]}>
          <Silhouette id={lm.id} height={lm.alturaM} baseM={lm.baseM} opacity={cmp.opacity * 1.6} />
          <Label position={[0, lm.alturaM + 4, 0]} tone="referencia" align="center" show={cmp.opacity > 0.4}>
            {lm.id === 'eiffel' ? 'punta de la Torre Eiffel' : `punta del ${lm.nombre}`} en la superficie
          </Label>
          <Label position={[-10, 2, 0]} tone="hecho" align="right" show={cmp.opacity > 0.4}>
            <strong>{lm.nombre}</strong> · {String(lm.alturaM).replace('.', ',')} m
          </Label>
        </group>
      )}

      <WreckSite labels={depth > 700} scaleLabel />
    </group>
  );
}
