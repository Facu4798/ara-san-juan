import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { storyStore } from '../../story/store';
import { T } from '../../journey/timeline';
import { subAt, COLLAPSE_DEPTH_M } from '../../journey/subPath';
import { ANCHOR } from '../../journey/anchors';
import { clamp, seg } from '../../journey/track';
import { live } from '../../journey/live';

/**
 * REPRESENTACIÓN DEL COLAPSO (10:51). No reproduce el hecho: no se publicó a qué profundidad ni cómo
 * ocurrió. Es una implosión conceptual: el casco cede hacia adentro (deformación en SubmarineModel),
 * una onda de presión esférica atraviesa el agua y una nube de burbujas sale despedida. Sin fuego,
 * sin fragmentos y sin restos.
 *
 * Todo es función pura del tiempo desde el colapso (c = t − T.colapso).
 */
const BURST = 420;
const CENTER = new THREE.Vector3(ANCHOR.wreck.x, -COLLAPSE_DEPTH_M / 1000, ANCHOR.wreck.z);

const ptsVertex = /* glsl */ `
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
const ptsFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vA;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float a = smoothstep(1.0, 0.15, d) * vA;
    gl_FragColor = vec4(uColor, a);
  }
`;

const shellVertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const shellFragment = /* glsl */ `
  uniform float uAlpha;
  uniform vec3 uColor;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
    gl_FragColor = vec4(uColor, f * uAlpha);
  }
`;

export function Collapse() {
  const shell = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Points>(null);
  const burst = useRef<THREE.Points>(null);
  const shellUniforms = useMemo(() => ({ uAlpha: { value: 0 }, uColor: { value: new THREE.Color('#9fd8ea') } }), []);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);

  const dirs = useMemo(() => {
    const out: THREE.Vector3[] = [];
    let s = 99;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < BURST; i++) {
      const u = rnd() * 2 - 1;
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      out.push(new THREE.Vector3(r * Math.cos(a), u, r * Math.sin(a)).multiplyScalar(0.35 + rnd() * 0.65));
    }
    return out;
  }, []);
  const burstGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BURST * 3), 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(BURST), 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(BURST).fill(1), 1));
    return g;
  }, []);
  const coreGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(1), 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(1).fill(1), 1));
    return g;
  }, []);
  const burstU = useMemo(() => ({ uPx: { value: 8 }, uColor: { value: new THREE.Color('#cfeaf3') } }), []);
  const coreU = useMemo(() => ({ uPx: { value: 120 }, uColor: { value: new THREE.Color('#e9f6fb') } }), []);

  useFrame(({ camera, gl }) => {
    const t = storyStore.get().t;
    const c = t - T.colapso;
    const active = c > -0.05 && c < 4.2;
    for (const o of [shell.current, ring.current, core.current, burst.current]) if (o) o.visible = active && c > 0;
    if (!active || c <= 0) return;

    // Centro: donde quedó el casco al colapsar (sigue al submarino hasta ese instante).
    const s = subAt(T.colapso);
    CENTER.copy(s.pos);
    const ndc = CENTER.clone().project(camera);
    live.collapseNdc.x = ndc.x;
    live.collapseNdc.y = ndc.y;

    // Onda de choque: crece rápido y se frena (velocidad de la onda de presión, escala de puesta en escena).
    const r = 1.35 * (1 - Math.exp(-c * 1.5)) + 0.002;
    const a = Math.pow(clamp(1 - c / 3.2), 1.6);
    if (shell.current) {
      shell.current.position.copy(CENTER);
      shell.current.scale.setScalar(r);
      shellUniforms.uAlpha.value = 0.55 * a * seg(c, 0, 0.05);
    }
    if (ring.current) {
      ring.current.position.copy(CENTER);
      ring.current.scale.setScalar(r * 1.02);
      ring.current.lookAt(camera.position);
      if (ringMat.current) ringMat.current.opacity = 0.7 * a;
    }

    // Núcleo luminoso: un destello breve en el punto del colapso.
    const px = gl.getPixelRatio();
    const ca = coreGeo.getAttribute('position') as THREE.BufferAttribute;
    ca.setXYZ(0, CENTER.x, CENTER.y, CENTER.z);
    ca.needsUpdate = true;
    (coreGeo.getAttribute('aAlpha') as THREE.BufferAttribute).setX(0, 0.95 * Math.exp(-c * 5.2) * seg(c, 0, 0.04));
    (coreGeo.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true;
    coreU.uPx.value = px * (260 - 120 * clamp(c / 0.6));

    // Burbujas: salen radialmente y se frenan; algunas suben.
    const bp = burstGeo.getAttribute('position') as THREE.BufferAttribute;
    const ba = burstGeo.getAttribute('aAlpha') as THREE.BufferAttribute;
    const bs = burstGeo.getAttribute('aSize') as THREE.BufferAttribute;
    const drag = 1 - Math.exp(-c * 1.9);
    for (let i = 0; i < BURST; i++) {
      const d = dirs[i];
      const reach = 0.5 * drag * (0.6 + 0.4 * ((i * 7) % 10) / 10);
      bp.setXYZ(i, CENTER.x + d.x * reach, CENTER.y + d.y * reach + 0.012 * c * c * (0.4 + ((i * 3) % 7) / 7), CENTER.z + d.z * reach);
      ba.setX(i, 0.85 * Math.pow(clamp(1 - c / 3.6), 1.3) * seg(c, 0.02, 0.12));
      bs.setX(i, 0.5 + ((i * 13) % 11) / 11);
    }
    bp.needsUpdate = true;
    ba.needsUpdate = true;
    burstU.uPx.value = px * 7;
  });

  return (
    <group>
      <mesh ref={shell} visible={false} frustumCulled={false}>
        <sphereGeometry args={[1, 40, 28]} />
        <shaderMaterial
          vertexShader={shellVertex}
          fragmentShader={shellFragment}
          uniforms={shellUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </mesh>
      <mesh ref={ring} visible={false} frustumCulled={false}>
        <ringGeometry args={[0.992, 1, 160]} />
        <meshBasicMaterial ref={ringMat} color="#bfe8f5" transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} fog={false} />
      </mesh>
      <points ref={core} geometry={coreGeo} visible={false} frustumCulled={false} renderOrder={7}>
        <shaderMaterial vertexShader={ptsVertex} fragmentShader={ptsFragment} uniforms={coreU} transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} fog={false} />
      </points>
      <points ref={burst} geometry={burstGeo} visible={false} frustumCulled={false} renderOrder={6}>
        <shaderMaterial vertexShader={ptsVertex} fragmentShader={ptsFragment} uniforms={burstU} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </points>
    </group>
  );
}
