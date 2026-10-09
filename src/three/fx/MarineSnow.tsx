import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { live } from '../../journey/live';

/**
 * NIEVE MARINA Y BURBUJAS. Partículas que rodean a la cámara bajo el agua: cuanto más profundo y más
 * tensa la escena, más rápidas y densas. Es puesta en escena (no un dato): el movimiento del agua en
 * el sitio no se midió. Una caja que sigue a la cámara; las partículas dan la vuelta dentro de ella.
 */
const N = 1400;

const vertex = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uAmount;
  uniform float uBox;
  uniform float uPx;
  uniform vec3 uCenter;
  varying float vA;
  void main() {
    vec3 p = fract(aSeed.xyz + vec3(sin(uTime * 0.13 + aSeed.w * 6.28) * 0.03, -uTime * uSpeed * (0.4 + aSeed.w), cos(uTime * 0.11 + aSeed.w * 9.0) * 0.03));
    vec3 q = uCenter + (p - 0.5) * uBox;
    vec4 mv = viewMatrix * vec4(q, 1.0);
    gl_Position = projectionMatrix * mv;
    float edge = 1.0 - smoothstep(0.35, 0.5, length(p - 0.5));
    float on = step(aSeed.w, uAmount);
    vA = edge * on * (0.35 + 0.65 * aSeed.w);
    gl_PointSize = uPx * (0.7 + 1.6 * aSeed.w) * clamp(0.04 / max(-mv.z / uBox, 0.01), 0.5, 3.0);
  }
`;
const fragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vA;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = smoothstep(0.5, 0.05, length(c));
    gl_FragColor = vec4(uColor, d * vA * 0.75);
  }
`;

export function MarineSnow() {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(N * 4);
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N * 4; i++) seed[i] = rnd();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    return g;
  }, []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: 0.02 },
      uAmount: { value: 0 },
      uBox: { value: 0.1 },
      uPx: { value: 3 },
      uCenter: { value: new THREE.Vector3() },
      uColor: { value: new THREE.Color('#bfe3ee') },
    }),
    [],
  );
  const mesh = useMemo(() => ({ ref: null as THREE.Object3D | null }), []);

  useFrame(({ camera, gl }, dt) => {
    const env = live.env;
    const cam = live.cam;
    if (!env || !cam) return;
    const under = camera.position.y < -0.001;
    const u = uniforms;
    u.uTime.value += Math.min(dt, 0.1);
    // Caja proporcional a la distancia a la que se mira: siempre hay partículas «cerca» y «lejos».
    const box = Math.min(1.2, Math.max(0.04, cam.dist * 3.2));
    u.uBox.value = box;
    u.uCenter.value.copy(camera.position);
    u.uSpeed.value = (0.012 + 0.05 * env.stress + 0.01 * env.snow) / Math.max(0.2, box * 6);
    u.uAmount.value = under ? Math.min(1, env.snow * 0.9) : 0;
    u.uPx.value = gl.getPixelRatio() * 3.2;
    u.uColor.value.set('#bfe3ee').lerp(new THREE.Color('#e4c9a0'), env.amber * 0.5);
    if (mesh.ref) mesh.ref.visible = under && env.snow > 0.01;
  });

  return (
    <points ref={(p) => { mesh.ref = p; }} geometry={geometry} frustumCulled={false} renderOrder={5}>
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} fog={false} />
    </points>
  );
}
