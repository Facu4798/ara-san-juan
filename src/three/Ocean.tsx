import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { seg } from '../journey/track';

/**
 * SUPERFICIE DEL MAR del viaje continuo (1 unidad = 1 km). Una malla polar centrada en la cámara:
 * anillos muy finos cerca (olas de metros) y cada vez más anchos hasta 80 km, así el mismo mar
 * sirve a ras del agua y desde 20 km de altura. Las olas se calculan en metros sobre coordenadas
 * de mundo (no se «arrastran» con la cámara), crecen con el temporal y se aplanan con la distancia.
 * Vista desde abajo es una lámina clara: marca dónde está la superficie.
 */
const RINGS = 78;
const SEGMENTS = 176;
const R0 = 0.0035;
const R1 = 80;

function polarGeometry() {
  const pos: number[] = [0, 0, 0];
  for (let i = 0; i <= RINGS; i++) {
    const r = R0 * Math.pow(R1 / R0, i / RINGS);
    for (let s = 0; s < SEGMENTS; s++) {
      const a = (s / SEGMENTS) * Math.PI * 2;
      pos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }
  const idx: number[] = [];
  for (let s = 0; s < SEGMENTS; s++) idx.push(0, 1 + ((s + 1) % SEGMENTS), 1 + s);
  for (let i = 0; i < RINGS; i++) {
    const a = 1 + i * SEGMENTS;
    const b = a + SEGMENTS;
    for (let s = 0; s < SEGMENTS; s++) {
      const s1 = (s + 1) % SEGMENTS;
      idx.push(a + s, a + s1, b + s, a + s1, b + s1, b + s);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uStorm;
  uniform float uAmp;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vFoam;
  #include <fog_pars_vertex>
  float h(vec2 p) {
    // p en metros
    float calm = sin(p.x * 0.045 + uTime * 0.55) * 0.35
               + sin(p.y * 0.06 - uTime * 0.42) * 0.28
               + sin((p.x + p.y) * 0.11 + uTime * 0.9) * 0.12;
    float swell = sin(p.x * 0.021 + p.y * 0.012 + uTime * 0.7) * 1.1
                + sin(p.y * 0.03 - p.x * 0.008 - uTime * 0.55) * 0.7
                + sin((p.x - p.y) * 0.052 + uTime * 1.1) * 0.35;
    return (calm + uStorm * swell) * uAmp;
  }
  void main() {
    vec4 w0 = modelMatrix * vec4(position, 1.0);
    float far = length(w0.xz - cameraPosition.xz);
    float fade = 1.0 - smoothstep(0.5, 3.2, far);
    vec2 pm = w0.xz * 1000.0;
    float e = 0.7;
    float hc = h(pm) * fade;
    float dx = (h(pm + vec2(e, 0.0)) - h(pm - vec2(e, 0.0))) * fade / (2.0 * e);
    float dz = (h(pm + vec2(0.0, e)) - h(pm - vec2(0.0, e))) * fade / (2.0 * e);
    vNormalW = normalize(vec3(-dx, 1.0, -dz));
    vFoam = smoothstep(0.55, 1.5, hc) * uStorm;
    vec4 world = vec4(w0.x, hc * 0.001, w0.z, 1.0);
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
  uniform vec3 uGlint;
  uniform float uOpacity;
  uniform float uUnderAlpha;
  uniform float uGlintAmt;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vFoam;
  #include <fog_pars_fragment>
  void main() {
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 n = gl_FrontFacing ? vNormalW : -vNormalW;
    float f = pow(1.0 - max(dot(v, n), 0.0), 3.0);
    vec3 col;
    float a;
    if (gl_FrontFacing) {
      col = mix(uDeep, uSky, clamp(f * 1.1, 0.0, 1.0));
      float spec = pow(max(dot(reflect(-v, n), normalize(vec3(-0.3, 0.8, -0.5))), 0.0), 70.0);
      col += uGlint * spec * uGlintAmt;
      col = mix(col, vec3(0.78, 0.86, 0.9), clamp(vFoam, 0.0, 0.6));
      a = 0.94;
    } else {
      col = uUnder;
      a = uUnderAlpha;
    }
    gl_FragColor = vec4(col, a * uOpacity);
    #include <fog_fragment>
  }
`;

/** Estado visual del mar, lo actualiza el director del viaje cada cuadro. */
export const oceanLook = {
  storm: 0,
  amp: 1,
  night: 1,
  deep: new THREE.Color('#1f4a5d'),
  sky: new THREE.Color('#7f9eac'),
  under: new THREE.Color('#5e8ea0'),
  underAlpha: 0.72,
};

export function Ocean() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(polarGeometry, []);
  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uStorm: { value: 0 },
          uAmp: { value: 1 },
          uOpacity: { value: 1 },
          uGlintAmt: { value: 0.25 },
          uUnderAlpha: { value: 0.72 },
          uDeep: { value: new THREE.Color() },
          uSky: { value: new THREE.Color() },
          uUnder: { value: new THREE.Color() },
          uGlint: { value: new THREE.Color('#fff4dc') },
        },
      ]),
    [],
  );

  useFrame(({ camera }, dt) => {
    const m = mat.current;
    const o = mesh.current;
    if (!m || !o) return;
    o.position.set(camera.position.x, 0, camera.position.z);
    const u = m.uniforms;
    u.uTime.value += Math.min(dt, 0.1);
    u.uStorm.value = oceanLook.storm;
    u.uAmp.value = oceanLook.amp;
    // Sólo se ve cuando la cámara está cerca del mar; de lejos manda el mapa.
    const alt = Math.abs(camera.position.y);
    u.uOpacity.value = 1 - seg(alt, 18, 70);
    o.visible = u.uOpacity.value > 0.003;
    u.uDeep.value.copy(oceanLook.deep);
    u.uSky.value.copy(oceanLook.sky);
    u.uUnder.value.copy(oceanLook.under);
    u.uUnderAlpha.value = oceanLook.underAlpha;
    u.uGlintAmt.value = 0.1 + 0.5 * oceanLook.night;
  });

  return (
    <mesh ref={mesh} geometry={geometry} renderOrder={2} frustumCulled={false}>
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

/**
 * Cielo: degradé y estrellas sobre una cúpula pegada a la cámara y escalada a su plano lejano.
 * De noche (al abrir la pieza) se ven estrellas; sólo es visible sobre el agua.
 */
export const skyLook = {
  top: new THREE.Color('#050b17'),
  horizon: new THREE.Color('#12283a'),
  stars: 1,
};

export function Sky() {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const starMat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() } }), []);
  const stars = useMemo(() => {
    const pts: number[] = [];
    const sizes: number[] = [];
    let seed = 17;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 520; i++) {
      const u = rnd();
      const el = Math.asin(0.04 + 0.96 * u);
      const az = rnd() * Math.PI * 2;
      pts.push(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
      sizes.push(0.6 + rnd() * rnd() * 2.2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    return g;
  }, []);

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    const cam = camera as THREE.PerspectiveCamera;
    g.position.copy(cam.position);
    g.scale.setScalar(cam.far * 0.85);
    g.visible = cam.position.y > -0.003;
    uniforms.uTop.value.copy(skyLook.top);
    uniforms.uHorizon.value.copy(skyLook.horizon);
    if (starMat.current) starMat.current.uniforms.uAlpha.value = skyLook.stars;
  });

  return (
    <group ref={group} renderOrder={-2}>
      <mesh>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial
          ref={mat}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
          uniforms={uniforms}
          vertexShader={`varying float vy; void main(){ vy = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={`uniform vec3 uTop; uniform vec3 uHorizon; varying float vy; void main(){ gl_FragColor = vec4(mix(uHorizon, uTop, smoothstep(-0.02, 0.5, vy)), 1.0); }`}
        />
      </mesh>
      <points geometry={stars} renderOrder={-1}>
        <shaderMaterial
          ref={starMat}
          transparent
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
          uniforms={{ uAlpha: { value: 1 } }}
          vertexShader={`attribute float aSize; varying float vS; void main(){ vS = aSize; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * 1.7; }`}
          fragmentShader={`uniform float uAlpha; varying float vS; void main(){ vec2 c = gl_PointCoord - 0.5; float d = smoothstep(0.5, 0.0, length(c)); gl_FragColor = vec4(vec3(0.85,0.92,1.0), d * uAlpha * (0.35 + 0.18 * vS)); }`}
        />
      </points>
    </group>
  );
}
