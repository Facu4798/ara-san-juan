import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GeoData, ExploreData } from '../utils/loadData';
import { beats, type WorldId } from '../story/beats';
import { storyStore, useStory, useStorySelector } from '../story/store';
import { WRECK_DEPTH_M } from '../data/depth';
import { shotFor, CLIP } from './cameraPaths';
import { MapWorld } from './MapWorld';
import { DepthWorld } from './DepthWorld';
import { ImplosionConcept } from './ImplosionConcept';
import { ExploreScene } from './explore/ExploreScene';
import { appStore, useApp } from '../app/appStore';

/**
 * ESCENARIO 3D. Un único Canvas para toda la experiencia (un solo contexto WebGL).
 * Se carga bajo demanda mientras se ve la portada.
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
      camera={{ fov: 45, near: 0.5, far: 9000, position: [0, 7, 96] }}
      aria-hidden="true"
    >
      <Atmosphere />
      {mode === 'story' ? <StoryScene geo={geo} /> : <ExploreScene geo={geo} data={explore} />}
    </Canvas>
  );
}

/** Historia guiada: los mundos siguen al momento del relato. */
function StoryScene({ geo }: { geo: GeoData }) {
  const { index, p } = useStory();
  const beat = beats[index];
  const world = beat.world;
  return (
    <>
      <group visible={world === 'map'}>
        <MapWorld geo={geo} beatId={world === 'map' ? beat.id : ''} p={p} active={world === 'map'} />
      </group>
      <group visible={world === 'depth'}>
        <DepthWorld geo={geo} beatId={world === 'depth' ? beat.id : ''} p={p} active={world === 'depth'} />
      </group>
      {world === 'concept' && <ImplosionConcept p={p} />}
      <CameraRig />
    </>
  );
}

// ——— Atmósfera: fondo, niebla y luz ———

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

function Atmosphere() {
  const { scene, camera } = useThree();
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const bg = useMemo(() => new THREE.Color(), []);
  const fog = useMemo(() => new THREE.FogExp2('#163341', 0.0001), []);

  useFrame(() => {
    const { index, p } = storyStore.get();
    const app = appStore.get();
    const story = app.mode === 'story';
    const b = story
      ? beats[index]
      : { world: app.module === 'profundidad' ? 'depth' : app.module === 'travesia' && app.subInspect ? 'concept' : 'map', id: app.module };
    scene.fog = fog;
    let density = 0;
    let hemiI = 1.2;
    let sunI = 1.2;
    let lampI = 0;

    if (b.world === 'map') {
      bg.copy(MAP_BG);
      density = 0.00019;
      hemiI = 1.35;
      sunI = 1.6;
    } else if (b.world === 'concept') {
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
        // En el plano abierto del hallazgo el agua se aclara para ver las siluetas completas.
        if (b.id === 'hallazgo') density *= 1 - 0.68 * THREE.MathUtils.smoothstep(p, 0.05, 0.6);
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

// ——— Cámara ———

function CameraRig() {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3());
  const world = useRef<WorldId | null>(null);
  const offsetKey = useRef('');

  useFrame((_, dt) => {
    const { index, p } = storyStore.get();
    const b = beats[index];
    const shot = shotFor(b.world, b.id, p);
    const cam = camera as THREE.PerspectiveCamera;

    // Encuadre: con tarjeta de texto, el centro óptico se corre hacia el área libre
    // (a la derecha en pantallas anchas, hacia arriba en celulares, donde la tarjeta va abajo).
    const wide = size.width > 860;
    const withCard = b.layout === 'card';
    // En celulares, el grupo de siluetas del mundo de profundidad queda a la izquierda del eje: se recentra.
    const ox = withCard && wide ? Math.min(200, size.width * 0.13) : withCard && b.world === 'depth' ? size.width * 0.3 : 0;
    const oy = withCard && !wide ? size.height * 0.17 : 0;
    const key = `${size.width}x${size.height}:${ox}:${oy}`;
    if (key !== offsetKey.current) {
      offsetKey.current = key;
      cam.setViewOffset(size.width, size.height, -ox, oy, size.width, size.height);
    }

    if (world.current !== b.world) {
      // Cambio de mundo: corte limpio (la interfaz cubre el salto con un fundido).
      world.current = b.world;
      cam.near = CLIP[b.world].near;
      cam.far = CLIP[b.world].far;
      cam.updateProjectionMatrix();
      cam.position.copy(shot.pos);
      look.current.copy(shot.target);
    } else {
      const k = 1 - Math.exp(-Math.min(dt, 0.1) * 3.4);
      cam.position.lerp(shot.pos, k);
      look.current.lerp(shot.target, k);
    }
    cam.lookAt(look.current);
  });
  return null;
}
