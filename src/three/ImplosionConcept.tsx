import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { absolutePressureAtm, kgfPerCm2 } from '../utils/physics';
import { WRECK_DEPTH_M } from '../data/depth';
import { fmt0 } from '../utils/format';
import { Label } from './Label';

/**
 * REPRESENTACIÓN CONCEPTUAL de una implosión. No reproduce el hecho: no se publicó a qué
 * profundidad ocurrió el colapso ni cómo. Sirve para entender el fenómeno físico:
 *   1. la presión del agua crece y empuja por igual desde todos lados (flechas);
 *   2. cuando supera la resistencia del casco, la sección colapsa hacia adentro;
 *   3. queda una onda de presión que se propaga (la que registran los hidrófonos).
 * Sin fragmentos, fuego ni personas: una sección de casco en malla, abstracta.
 */
const R = 3.5;
const LEN = 22;
const RINGS = 5;
const PER_RING = 14;

const smooth = (t: number) => t * t * (3 - 2 * t);
const seg = (p: number, a: number, b: number) => smooth(Math.min(1, Math.max(0, (p - a) / (b - a))));

/** Fases del momento (p de 0 a 1). */
export const PHASE = { pressureEnd: 0.38, collapseEnd: 0.47, waveEnd: 0.95 };

export function ImplosionConcept({ p }: { p: number }) {
  const hull = useRef<THREE.Mesh>(null);
  const wave = useRef<THREE.Mesh>(null);
  const waveRing = useRef<THREE.Mesh>(null);
  const arrows = useMemo(() => {
    const list: { dir: THREE.Vector3; base: THREE.Vector3; helper: THREE.ArrowHelper }[] = [];
    for (let r = 0; r < RINGS; r++) {
      const x = -LEN / 2 + 2 + (r * (LEN - 4)) / (RINGS - 1);
      for (let i = 0; i < PER_RING; i++) {
        const a = (i / PER_RING) * Math.PI * 2 + (r % 2) * 0.2;
        const out = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
        const base = new THREE.Vector3(x, 0, 0);
        const helper = new THREE.ArrowHelper(out.clone().negate(), base, 1, 0x9fd3e3, 0.5, 0.32);
        (helper.line.material as THREE.LineBasicMaterial).transparent = true;
        (helper.cone.material as THREE.MeshBasicMaterial).transparent = true;
        list.push({ dir: out, base, helper });
      }
    }
    return list;
  }, []);

  const pressure = seg(p, 0.02, PHASE.pressureEnd);
  const collapse = Math.pow(Math.min(1, Math.max(0, (p - PHASE.pressureEnd) / (PHASE.collapseEnd - PHASE.pressureEnd))), 2.2);
  const waveT = Math.min(1, Math.max(0, (p - PHASE.collapseEnd) / (PHASE.waveEnd - PHASE.collapseEnd)));

  useFrame(({ camera }) => {
    const radial = 1 - 0.8 * collapse;
    if (hull.current) {
      // El cilindro está girado: su eje local y es el largo del casco; x y z son el radio.
      // Colapso radial con una leve irregularidad (los cascos no colapsan como un cilindro perfecto).
      hull.current.scale.set(radial, 1 - 0.12 * collapse, radial * (1 - 0.18 * collapse));
      (hull.current.material as THREE.MeshBasicMaterial).opacity = 0.75 - 0.35 * seg(p, PHASE.collapseEnd, 0.9);
    }
    const len = 0.6 + 3.6 * pressure;
    const fade = 1 - seg(p, PHASE.pressureEnd, PHASE.collapseEnd + 0.04);
    for (const a of arrows) {
      const start = a.base.clone().add(a.dir.clone().multiplyScalar(R * radial + 0.4 + len));
      a.helper.position.copy(start);
      a.helper.setLength(len, Math.min(0.6, len * 0.35), 0.32);
      (a.helper.line.material as THREE.LineBasicMaterial).opacity = (0.35 + 0.65 * pressure) * fade;
      (a.helper.cone.material as THREE.MeshBasicMaterial).opacity = (0.35 + 0.65 * pressure) * fade;
      a.helper.visible = fade > 0.01;
    }
    const r = 1 + waveT * 22;
    if (wave.current) {
      wave.current.visible = waveT > 0 && waveT < 1;
      wave.current.scale.setScalar(r);
      (wave.current.material as THREE.MeshBasicMaterial).opacity = 0.1 * (1 - waveT);
    }
    if (waveRing.current) {
      waveRing.current.visible = waveT > 0 && waveT < 1;
      waveRing.current.scale.setScalar(r);
      waveRing.current.lookAt(camera.position);
      (waveRing.current.material as THREE.MeshBasicMaterial).opacity = 0.65 * (1 - waveT);
    }
  });

  const atm = 1 + (absolutePressureAtm(WRECK_DEPTH_M) - 1) * pressure;
  const kg = kgfPerCm2(WRECK_DEPTH_M) * pressure;

  return (
    <group>
      <mesh ref={hull} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[R, R, LEN, 36, 8, true]} />
        <meshBasicMaterial color="#dbe9ee" wireframe transparent opacity={0.75} />
      </mesh>
      {arrows.map((a, i) => (
        <primitive key={i} object={a.helper} />
      ))}
      <mesh ref={wave} visible={false}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial color="#7cc4d8" transparent opacity={0.1} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      <mesh ref={waveRing} visible={false}>
        <ringGeometry args={[0.988, 1, 160]} />
        <meshBasicMaterial color="#7cc4d8" transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <Label position={[0, 11, 0]} tone="hipotesis" align="center">
        REPRESENTACIÓN CONCEPTUAL · no reproduce el hecho
      </Label>
      <Label position={[0, -9.5, 0]} tone="estimacion" align="center" show={p < PHASE.collapseEnd}>
        presión exterior ≈ {fmt0(atm)} atm · {fmt0(kg)} kg/cm²
        <br />
        <span className="lbl-sub">cálculo para 907 m · aumenta con la profundidad</span>
      </Label>
      <Label position={[0, -9.5, 0]} tone="referencia" align="center" show={p >= PHASE.collapseEnd && p < 0.9}>
        onda de presión
      </Label>
    </group>
  );
}
