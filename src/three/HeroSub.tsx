import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { storyStore } from '../story/store';
import { subAt } from '../journey/subPath';
import { symbolScale } from '../journey/camera';
import { SubmarineModel, heroLook, collapseUniform } from './SubmarineModel';

/**
 * EL PROTAGONISTA. Un único submarino para toda la película: su posición, rumbo, profundidad y
 * estado salen de subAt(t). Se dibuja como símbolo agrandado cuando la cámara está lejos (rotulado
 * «no a escala» en pantalla) y a escala 1:1 de cerca, con una transición continua de tamaño.
 */
export function HeroSub() {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const e = useRef(new THREE.Euler());

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    const t = storyStore.get().t;
    const s = subAt(t);
    const dist = camera.position.distanceTo(s.pos);
    const scale = symbolScale(dist);

    g.visible = s.mode !== 'oculto';
    g.position.copy(s.pos);
    e.current.set(s.roll, s.yaw, s.pitch, 'YZX');
    g.rotation.copy(e.current);
    g.scale.setScalar(scale);

    heroLook.opacity = s.opacity;
    heroLook.ghost = s.mode === 'fantasma' ? 1 : 0;
    heroLook.recon = s.mode === 'reconstruccion' ? 1 : 0;
    heroLook.spin = Math.min(14, s.speedKn * 1.15);
    collapseUniform.value = s.collapse;

    // Anillo-símbolo alrededor del submarino cuando está agrandado: ayuda a leerlo a escala de mapa.
    const r = ring.current;
    if (r) {
      const big = scale > 0.004;
      r.visible = big && s.mode !== 'oculto' && s.surfaced;
      (r.material as THREE.MeshBasicMaterial).opacity = Math.min(0.6, scale * 0.2) * s.opacity;
    }
  });

  return (
    <group ref={group} frustumCulled={false}>
      <SubmarineModel hero />
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <ringGeometry args={[52, 56, 64]} />
        <meshBasicMaterial color="#eaf4f8" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
