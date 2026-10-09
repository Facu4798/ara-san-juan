import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LANDMARKS, tipDepthM } from '../data/landmarks';
import { WRECK_DEPTH_M } from '../data/depth';
import { Label } from './Label';
import { fmt0 } from '../utils/format';

/**
 * Referencias de altura a escala real 1:1, APOYADAS a 907 m: así se lee de un vistazo cuánto
 * falta hasta la superficie. Sólo la altura (y la base del Obelisco) son datos; las formas son
 * siluetas esquemáticas en malla, para no competir con los datos del submarino.
 */
export const LANDMARK_X: Record<string, number> = { obelisco: -60, burj: 90, eiffel: 250 };

/** Perfil de giro (radio, altura) para LatheGeometry. */
function profile(id: string, h: number): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  if (id === 'eiffel') {
    // Curva de la torre: base ancha que se afina hacia la punta (forma esquemática).
    for (let i = 0; i <= 24; i++) {
      const y = (i / 24) * h;
      pts.push(new THREE.Vector2(Math.max(0.6, 88 * Math.pow(1 - y / h, 2.2)), y));
    }
  } else {
    // Rascacielos escalonado con aguja (forma esquemática).
    const steps: [number, number][] = [[46, 0], [46, 0.18], [38, 0.18], [38, 0.36], [30, 0.36], [30, 0.54], [22, 0.54], [22, 0.7], [13, 0.7], [13, 0.78], [5, 0.78], [0.6, 1]];
    for (const [r, f] of steps) pts.push(new THREE.Vector2(r, f * h));
  }
  return pts;
}

export function Silhouette({ id, height, baseM, opacity = 1 }: { id: string; height: number; baseM?: number; opacity?: number }) {
  const geometry = useMemo(() => {
    if (id === 'obelisco') {
      // Prisma de base cuadrada (6,8 m de lado) con piramidión.
      const s = baseM ?? 6.8;
      const top = s * 0.52;
      const pyr = 5;
      const shaft = new THREE.CylinderGeometry(top / Math.SQRT2, s / Math.SQRT2, height - pyr, 4, 6).translate(0, (height - pyr) / 2, 0);
      const tip = new THREE.CylinderGeometry(0, top / Math.SQRT2, pyr, 4, 1).translate(0, height - pyr / 2, 0);
      const g = mergeGeometries([shaft.toNonIndexed(), tip.toNonIndexed()])!;
      g.rotateY(Math.PI / 4);
      return g;
    }
    return new THREE.LatheGeometry(profile(id, height), id === 'eiffel' ? 4 : 6).rotateY(Math.PI / 4);
  }, [id, height, baseM]);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#bcdbe6" transparent opacity={0.07 * opacity} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#d7e9ef" wireframe transparent opacity={0.4 * opacity} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Landmarks({ cameraDepth, showAll, labels }: { cameraDepth: number; showAll: boolean; labels: boolean }) {
  return (
    <group position={[0, -WRECK_DEPTH_M, 0]}>
      {LANDMARKS.map((l) => {
        const tip = tipDepthM(l);
        const reached = showAll || cameraDepth >= tip - 25;
        return (
          <group key={l.id} position={[LANDMARK_X[l.id], 0, 0]}>
            <Silhouette id={l.id} height={l.alturaM} baseM={l.baseM} />
            <Label position={[0, l.alturaM + 6, 0]} tone="referencia" align="center" show={labels && reached}>
              <strong>{l.nombre}</strong> · {String(l.alturaM).replace('.', ',')} m
              <br />
              punta a {fmt0(tip)} m bajo el agua
            </Label>
          </group>
        );
      })}
    </group>
  );
}
