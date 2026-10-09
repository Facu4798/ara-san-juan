import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GeoData, ExploreData } from '../utils/loadData';
import { useStorySelector } from '../story/store';
import { WRECK_DEPTH_M } from '../data/depth';
import { JourneyWorld } from './JourneyWorld';
import { JourneyRig } from './JourneyRig';
import { ExploreScene } from './explore/ExploreScene';
import { terrainUniforms } from './terrain';
import { appStore, useApp } from '../app/appStore';

/**
 * ESCENARIO 3D. Un único Canvas para toda la experiencia (un solo contexto WebGL).
 * Se carga bajo demanda mientras se ve la portada.
 *
 * Historia guiada: un solo mundo continuo (JourneyWorld) y un director que mueve la cámara sin cortes.
 * Exploración: un mundo por módulo con cámara orbital libre.
 */
export default function Stage({ geo, explore }: { geo: GeoData; explore: ExploreData | null }) {
  const inStory = useStorySelector((s) => s.inStory);
  const mode = useApp((s) => s.mode);
  const methodologyOpen = useApp((s) => s.methodologyOpen);
  const running = mode === 'explore' ? !methodologyOpen : inStory;
  return (
    <Canvas
      className="stage-canvas"
      frameloop={running ? 'always' : 'never'}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 45, near: 0.0005, far: 6000, position: [0, 0.01, 0.1] }}
      aria-hidden="true"
    >
      {mode === 'story' ? (
        <>
          <JourneyRig />
          <JourneyWorld geo={geo} />
        </>
      ) : (
        <>
          <ExploreAtmosphere />
          <ExploreScene geo={geo} data={explore} />
        </>
      )}
    </Canvas>
  );
}

// ——— Atmósfera de los módulos de exploración: fondo, niebla y luz ———

/**
 * Color del agua según la profundidad de la cámara: gris celeste cerca de la superficie,
 * azul petróleo después y casi oscuro al llegar al fondo, sin llegar al negro.
 * Más profundidad = menos luz: comunica presión y aislamiento.
 */
const WATER_STOPS: [number, THREE.Color][] = [
  [0, new THREE.Color('#41758a')],
  [100, new THREE.Color('#25566c')],
  [400, new THREE.Color('#163a4a')],
  [WRECK_DEPTH_M, new THREE.Color('#0c2029')],
];

function waterColor(d: number, out: THREE.Color) {
  if (d <= 0) return out.copy(WATER_STOPS[0][1]);
  for (let i = 1; i < WATER_STOPS.length; i++) {
    if (d <= WATER_STOPS[i][0]) {
      const t = (d - WATER_STOPS[i - 1][0]) / (WATER_STOPS[i][0] - WATER_STOPS[i - 1][0]);
      return out.copy(WATER_STOPS[i - 1][1]).lerp(WATER_STOPS[i][1], t);
    }
  }
  return out.copy(WATER_STOPS[WATER_STOPS.length - 1][1]);
}

const MAP_BG = new THREE.Color('#14303e');
const SKY_HAZE = new THREE.Color('#7f9eac');
const CONCEPT_BG = new THREE.Color('#0f2733');

function ExploreAtmosphere() {
  const { scene, camera } = useThree();
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const bg = useMemo(() => new THREE.Color(), []);
  const fog = useMemo(() => new THREE.FogExp2('#163341', 0.0001), []);

  // El relieve del mapa vuelve a su exageración habitual (el viaje continuo lo desexagera al acercarse).
  useEffect(() => {
    terrainUniforms.uTrue.value = 0;
    terrainUniforms.uHoleOn.value = 0;
    (camera as THREE.PerspectiveCamera).fov = 45;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame(() => {
    const app = appStore.get();
    const world = app.module === 'profundidad' ? 'depth' : app.module === 'travesia' && app.subInspect ? 'concept' : 'map';
    scene.fog = fog;
    let density = 0;
    let hemiI = 1.2;
    let sunI = 1.2;
    let lampI = 0;

    if (world === 'map') {
      bg.copy(MAP_BG);
      density = 0.00019;
      hemiI = 1.35;
      sunI = 1.6;
    } else if (world === 'concept') {
      bg.copy(CONCEPT_BG);
      hemiI = 0.6;
      sunI = 0.4;
    } else {
      const d = -camera.position.y;
      if (d <= 0) {
        bg.copy(SKY_HAZE);
        density = 0.0016;
        hemiI = 1.5;
        sunI = 1.3;
      } else {
        waterColor(d, bg);
        const k = Math.min(1, d / WRECK_DEPTH_M);
        density = 0.0008 + 0.0004 * k;
        hemiI = THREE.MathUtils.lerp(1.35, 0.32, THREE.MathUtils.smoothstep(d, 0, 650));
        sunI = THREE.MathUtils.lerp(1.0, 0.08, THREE.MathUtils.smoothstep(d, 0, 400));
        // Luz de lectura cerca del fondo: convención visual para ver el relieve, no una fuente real.
        lampI = THREE.MathUtils.smoothstep(d, 450, 820) * 1.3;
      }
    }
    scene.background = bg;
    fog.color.copy(bg);
    fog.density = density;
    if (hemi.current) hemi.current.intensity = hemiI;
    if (sun.current) sun.current.intensity = sunI;
    if (lamp.current) lamp.current.intensity = lampI;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#d6e6ec', '#0b1a22', 1.2]} />
      <directionalLight ref={sun} position={[-1500, 2600, -900]} intensity={1.2} />
      <pointLight ref={lamp} position={[0, -WRECK_DEPTH_M + 140, 120]} intensity={0} distance={1800} decay={0} color="#cfe6ee" />
    </>
  );
}
