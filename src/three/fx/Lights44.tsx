import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { subAt } from '../../journey/subPath';
import { subMatrix } from '../../journey/subTransform';
import { symbolScale } from '../../journey/camera';
import { ANCHOR, SUB_START } from '../../journey/anchors';
import { T } from '../../journey/timeline';
import { clamp, lerp, seg, smooth } from '../../journey/track';
import { storyStore } from '../../story/store';
import { SUBMARINE } from '../../data/depth';

/**
 * LAS 44 LUCES. Una luz por persona (abstracto: no representa ubicaciones a bordo ni muestra personas).
 * Hilo de la pieza:
 *   I     flotan sobre el mar, en arco frente a la cámara;
 *   II    suben y se funden dentro del casco al zarpar y viajan con él;
 *   V-VI  acompañan el descenso;
 *   VI    tras el colapso se quedan flotando en el agua y descienden despacio hasta el fondo;
 *   VII   descansan sobre las coordenadas del hallazgo;
 *   VIII  ascienden, escalonadas, hasta la superficie y forman el memorial.
 * Todas las posiciones son función pura del tiempo.
 */
const N = 44;
const L = SUBMARINE.esloraM;

/** Pseudoaleatorio determinista. */
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const vertex = /* glsl */ `
  attribute float aAlpha;
  attribute float aSize;
  uniform float uPx;
  varying float vA;
  void main() {
    vA = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPx;
  }
`;
const fragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vA;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float core = smoothstep(1.0, 0.0, d);
    float a = (core * core * 0.9 + smoothstep(0.35, 0.0, d) * 0.7) * vA;
    gl_FragColor = vec4(uColor * (0.55 + 0.45 * core), a);
  }
`;

export const lightsState = {
  /** Intensidad global de las luces (0 a 1). */
  gain: 1,
};

/** Puntos del arco inicial (en mundo, km), de cara a la cámara de la primera toma (mira hacia +x desde −x). */
function arcPoint(i: number) {
  const row = i < 22 ? 0 : 1;
  const k = (i % 22) / 21;
  const a = (-0.95 + 1.9 * k) * 0.82;
  const R = (row === 0 ? 0.034 : 0.043) + 0.004 * Math.sin(i * 12.9898);
  return new THREE.Vector3(SUB_START.x - R * Math.cos(a) - 0.004, 0.0011 + 0.0006 * Math.sin(i * 3.1), SUB_START.z + R * Math.sin(a));
}

export function Lights44({ onFrame }: { onFrame?: (focus: THREE.Vector3) => void }) {
  const pts = useRef<THREE.Points>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const data = useMemo(() => {
    const r = rng(2017);
    const arc = Array.from({ length: N }, (_, i) => arcPoint(i));
    // Puntos dentro del casco (modelo, metros): repartidos a lo largo de la eslora, en dos hileras.
    const hull = Array.from({ length: N }, (_, i) => {
      const k = (i + 0.5) / N;
      const x = (k - 0.5) * (L * 0.74) - 3;
      const row = i % 2 === 0 ? 1 : -1;
      return new THREE.Vector3(x, (r() - 0.5) * 2.4, row * (0.9 + r() * 1.5));
    });
    const delay = Array.from({ length: N }, () => r());
    const phase = Array.from({ length: N }, () => r() * Math.PI * 2);
    const drift = Array.from({ length: N }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5));
    // Disposición final sobre el hallazgo (m, relativo): disco de ~14 m de radio.
    const rest = Array.from({ length: N }, (_, i) => {
      const a = i * 2.399963;
      const rr = 3 + 11 * Math.sqrt((i + 0.5) / N);
      return new THREE.Vector3(Math.cos(a) * rr, 0.6 + r() * 0.8, Math.sin(a) * rr);
    });
    // Disposición del memorial en superficie: arco de dos hileras sobre el hallazgo.
    const memorial = Array.from({ length: N }, (_, i) => {
      const row = i < 22 ? 0 : 1;
      const k = (i % 22) / 21;
      const a = (-0.5 + k) * Math.PI * 0.9;
      const R = (row === 0 ? 0.26 : 0.33) * 1000; // m
      return new THREE.Vector3(Math.sin(a) * R, 0.0, -Math.cos(a) * R + 40);
    });
    // Dónde estaban esas luces (mundo, km) justo antes del colapso: el submarino está a escala 1:1.
    const mc = subMatrix(subAt(T.colapso - 0.01), 0.001);
    const atCollapse = hull.map((h) => h.clone().applyMatrix4(mc));
    return { arc, hull, delay, phase, drift, rest, memorial, atCollapse };
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(N), 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(N).fill(1), 1));
    return g;
  }, []);
  const uniforms = useMemo(() => ({ uPx: { value: 20 }, uColor: { value: new THREE.Color('#ffe9c4') } }), []);

  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tmp2 = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size, gl }) => {
    const t = storyStore.get().t;
    const sub = subAt(t);
    const dist = camera.position.distanceTo(sub.pos);
    const sc = symbolScale(camera.position.distanceTo(sub.pos));
    subMatrix(sub, sc, m4);
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    const al = geometry.getAttribute('aAlpha') as THREE.BufferAttribute;
    const sz = geometry.getAttribute('aSize') as THREE.BufferAttribute;
    const px = gl.getPixelRatio();
    // Tamaño de pantalla estable: el punto no depende del zoom.
    uniforms.uPx.value = px * clamp(14 + 8 * Math.min(1, size.height / 900), 12, 26);

    const tIn = T.viaje; // se funden en el casco
    const tDeep = T.colapso;
    const tRest = T.hallazgo + 1.0; // quietas en el fondo
    const tUp = T.distancia + 0.15; // empiezan a ascender
    const wreckBed = ANCHOR.wreck;

    for (let i = 0; i < N; i++) {
      const d = data.delay[i];
      const flick = 0.85 + 0.15 * Math.sin(t * 1.7 + data.phase[i]);
      let a = 1;
      let size = 1;

      if (t < tIn) {
        // I · sobre el mar, con un balanceo leve.
        tmp.copy(data.arc[i]);
        tmp.y += 0.0004 * Math.sin(t * 0.7 + data.phase[i]);
        a = seg(t, 0.2, 1.6) * flick;
        size = 1.05;
      } else if (t < tDeep) {
        // II · del arco al interior del casco, en vuelo escalonado.
        const k = smooth(clamp((t - (tIn + 0.1 + d * 0.9)) / 1.15));
        tmp2.copy(data.hull[i]).applyMatrix4(m4);
        const arcP = data.arc[i];
        // Trayectoria curva: sube y se abre antes de entrar.
        tmp.copy(arcP).lerp(tmp2, k);
        tmp.y += Math.sin(k * Math.PI) * 0.012 * (0.5 + data.drift[i].y + 0.5);
        tmp.x += Math.sin(k * Math.PI) * 0.01 * data.drift[i].x;
        a = (k < 1 ? 1 : 0.55) * flick;
        size = k < 1 ? lerp(1.05, 0.7, k) : 0.62;
        // Dentro del casco sólo se ven cuando están cerca: de lejos, el casco ya es el símbolo.
        if (k >= 1) a *= 0.2 + 0.8 * seg(Math.log(Math.max(dist, 1e-4)), Math.log(6), Math.log(0.4));
        // Se apagan con el colapso.
        a *= 1 - seg(t, T.colapso - 0.4, T.colapso + 0.1);
      } else if (t < tUp) {
        // VI-VII · quedan flotando donde estaban y descienden despacio hasta el fondo del hallazgo.
        const c = t - tDeep;
        const from = data.atCollapse[i];
        const sink = smooth(clamp((t - (tDeep + 1.2 + d * 0.8)) / (tRest - tDeep - 0.4 - d * 0.4)));
        const toX = wreckBed.x + data.rest[i].x * 0.001;
        const toY = -0.9 + data.rest[i].y * 0.001;
        const toZ = wreckBed.z + data.rest[i].z * 0.001;
        tmp.set(
          lerp(from.x, toX, sink) + 0.004 * Math.sin(t * 0.5 + data.phase[i]) * (1 - sink),
          lerp(from.y, toY, sink),
          lerp(from.z, toZ, sink) + 0.004 * Math.cos(t * 0.45 + data.phase[i]) * (1 - sink),
        );
        a = seg(c, 0.0, 0.5) * flick * (0.55 + 0.45 * sink);
        size = 0.8;
      } else {
        // VIII · ascienden hasta la superficie y se disponen en arco (memorial).
        const u = clamp((t - (tUp + d * 1.0)) / 2.1);
        const e = smooth(u);
        const restX = wreckBed.x + data.rest[i].x * 0.001;
        const restZ = wreckBed.z + data.rest[i].z * 0.001;
        const mem = data.memorial[i];
        const spiral = (1 - e) * 0.006 * Math.sin(u * 7 + data.phase[i]);
        tmp.set(
          lerp(restX, wreckBed.x + mem.x * 0.001, e) + spiral,
          lerp(-0.9 + data.rest[i].y * 0.001, 0.0016 + 0.0006 * Math.sin(data.phase[i] + t * 0.7) * e, e),
          lerp(restZ, wreckBed.z + mem.z * 0.001, e) + spiral * 0.6,
        );
        a = flick;
        size = lerp(0.9, 1.35, e);
      }

      pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
      al.setX(i, clamp(a * lightsState.gain));
      sz.setX(i, size);
    }
    pos.needsUpdate = true;
    al.needsUpdate = true;
    sz.needsUpdate = true;
    onFrame?.(wreckBed);
  });

  return (
    <points ref={pts} geometry={geometry} renderOrder={6} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </points>
  );
}
