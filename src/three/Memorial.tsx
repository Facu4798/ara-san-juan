import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Memorial: 44 luces sobre el mar, una por persona de la nómina, en el orden del decreto.
 * Es una forma de homenaje, no representa ninguna ubicación.
 */
const N = 44;

function haloTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,248,232,1)');
  grd.addColorStop(0.25, 'rgba(255,244,222,0.55)');
  grd.addColorStop(1, 'rgba(255,240,215,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Memorial({ opacity = 1 }: { opacity?: number }) {
  const points = useRef<THREE.Points>(null);
  const base = useMemo(() => {
    // Arco suave frente a la cámara, en dos filas (44 = 22 + 22).
    const arr: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      const row = i < 22 ? 0 : 1;
      const k = (i % 22) / 21;
      const a = (-0.55 + 1.1 * k) * Math.PI * 0.5;
      const R = 34 + row * 9;
      arr.push([Math.sin(a) * R, -Math.cos(a) * R + 10]);
    }
    return arr;
  }, []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, []);
  const map = useMemo(haloTexture, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const [x, z] = base[i];
      pos.setXYZ(i, x, 0.9 + Math.sin(t * 0.7 + i * 0.6) * 0.25, z);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} renderOrder={3}>
      <pointsMaterial
        map={map}
        size={4.2}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </points>
  );
}
