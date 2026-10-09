import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Superficie del mar (mundo de profundidad). Shader propio: ondulación suave por suma de
 * senos, color según el ángulo de visión y niebla de la escena. Vista desde abajo es una
 * lámina clara: marca dónde está la superficie durante el descenso.
 */
const vertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  #include <fog_pars_vertex>
  float h(vec2 p) {
    return sin(p.x * 0.045 + uTime * 0.55) * 0.35
         + sin(p.y * 0.06 - uTime * 0.42) * 0.28
         + sin((p.x + p.y) * 0.11 + uTime * 0.9) * 0.12;
  }
  void main() {
    vec3 p = position;
    p.y += h(p.xz);
    float e = 0.6;
    float dx = (h(p.xz + vec2(e, 0.0)) - h(p.xz - vec2(e, 0.0))) / (2.0 * e);
    float dz = (h(p.xz + vec2(0.0, e)) - h(p.xz - vec2(0.0, e))) / (2.0 * e);
    vNormalW = normalize(vec3(-dx, 1.0, -dz));
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uSky;
  uniform vec3 uUnder;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  #include <fog_pars_fragment>
  void main() {
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 n = gl_FrontFacing ? vNormalW : -vNormalW;
    float f = pow(1.0 - max(dot(v, n), 0.0), 3.0);
    vec3 col;
    float a;
    if (gl_FrontFacing) {
      col = mix(uDeep, uSky, clamp(f * 1.1, 0.0, 1.0));
      float spec = pow(max(dot(reflect(-v, n), normalize(vec3(-0.3, 0.8, -0.5))), 0.0), 60.0);
      col += spec * 0.25;
      a = 0.94;
    } else {
      col = uUnder;
      a = 0.72;
    }
    gl_FragColor = vec4(col, a);
    #include <fog_fragment>
  }
`;

export function Water({ size = 6000 }: { size?: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size, 160, 160).rotateX(-Math.PI / 2), [size]);
  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uDeep: { value: new THREE.Color('#2b5c70') },
          uSky: { value: new THREE.Color('#a9c2cc') },
          uUnder: { value: new THREE.Color('#6f9fb1') },
        },
      ]),
    [],
  );
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });
  return (
    <mesh geometry={geometry} renderOrder={2}>
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        fog
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Cielo: degradé vertical sobre la superficie (sólo visible fuera del agua). */
export function Sky() {
  const uniforms = useMemo(
    () => ({ uTop: { value: new THREE.Color('#b7cbd4') }, uHorizon: { value: new THREE.Color('#7896a4') } }),
    [],
  );
  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[7000, 32, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`varying float vy; void main(){ vy = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
        fragmentShader={`uniform vec3 uTop; uniform vec3 uHorizon; varying float vy; void main(){ gl_FragColor = vec4(mix(uHorizon, uTop, smoothstep(0.0, 0.45, vy)), 1.0); }`}
      />
    </mesh>
  );
}
