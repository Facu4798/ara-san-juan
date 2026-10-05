import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as d3 from 'd3';
import type { Grid } from '../data/types';
import { POS_HALLAZGO } from '../data/positions';
import { WRECK_DEPTH_M, SUBMARINE, depthMarkers } from '../data/depth';

interface Props {
  depth: number;
  grid: Grid;
  /** Exageración vertical del relieve alrededor de la profundidad del hallazgo. 1 = escala real. */
  exaggeration: number;
  /** false: la sección no está en pantalla y no se dibujan cuadros. */
  active?: boolean;
}

/** Coordenadas locales en metros, centradas en el hallazgo. x = este, z = sur. */
function localXZ(lat: number, lon: number): [number, number] {
  const mPerDegLat = 110574;
  const mPerDegLon = 111320 * Math.cos((POS_HALLAZGO.lat * Math.PI) / 180);
  return [(lon - POS_HALLAZGO.lon) * mPerDegLon, -(lat - POS_HALLAZGO.lat) * mPerDegLat];
}

const elevToY = (elev: number, k: number) => -WRECK_DEPTH_M + (elev + WRECK_DEPTH_M) * k;

function buildTerrain(g: Grid, k: number) {
  const positions = new Float32Array(g.rows * g.cols * 3);
  const colors = new Float32Array(g.rows * g.cols * 3);
  const deep = new THREE.Color('#1d2c33');
  const shallow = new THREE.Color('#465c66');
  const c = new THREE.Color();
  for (let r = 0; r < g.rows; r++) {
    for (let col = 0; col < g.cols; col++) {
      const i = r * g.cols + col;
      const [x, z] = localXZ(g.lats[r], g.lons[col]);
      const e = g.elevation[i];
      positions.set([x, elevToY(e, k), z], i * 3);
      c.copy(deep).lerp(shallow, THREE.MathUtils.smoothstep(e, -1200, -700));
      colors.set([c.r, c.g, c.b], i * 3);
    }
  }
  const index: number[] = [];
  for (let r = 0; r < g.rows - 1; r++) {
    for (let col = 0; col < g.cols - 1; col++) {
      const a = r * g.cols + col, b = a + 1, cc = a + g.cols, d = cc + 1;
      // Orden antihorario visto desde arriba: la normal apunta hacia la superficie.
      index.push(a, b, cc, b, d, cc);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setIndex(index);
  geom.computeVertexNormals();
  return geom;
}

/** Isóbatas reales cada 25 m como segmentos 3D (una sola geometría). */
function buildIsobaths(g: Grid, k: number) {
  const thresholds = d3.range(-1200, -700, 25);
  const contours = d3.contours().size([g.cols, g.rows]).thresholds(thresholds)(g.elevation);
  const pts: number[] = [];
  const onBorder = (x: number, y: number) => x <= 0 || y <= 0 || x >= g.cols || y >= g.rows;
  const toLatLon = (x: number, y: number): [number, number] => {
    const fy = Math.min(g.rows - 1, Math.max(0, y - 0.5));
    const fx = Math.min(g.cols - 1, Math.max(0, x - 0.5));
    return [g.lats[0] + fy * (g.lats[1] - g.lats[0]), g.lons[0] + fx * (g.lons[1] - g.lons[0])];
  };
  for (const mp of contours) {
    const y = elevToY(mp.value, k) + 1.5;
    for (const poly of mp.coordinates) {
      for (const ring of poly) {
        for (let i = 1; i < ring.length; i++) {
          const [x0, y0] = ring[i - 1], [x1, y1] = ring[i];
          if (onBorder(x0, y0) && onBorder(x1, y1)) continue;
          const [la0, lo0] = toLatLon(x0, y0), [la1, lo1] = toLatLon(x1, y1);
          const [ax, az] = localXZ(la0, lo0), [bx, bz] = localXZ(la1, lo1);
          pts.push(ax, y, az, bx, y, bz);
        }
      }
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geom;
}

function Submarine({ y, ghost }: { y: number; ghost?: boolean }) {
  const r = SUBMARINE.cascoResistenteAnchoM / 2;
  return (
    <mesh position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
      <capsuleGeometry args={ghost ? [r, SUBMARINE.esloraM - 2 * r, 2, 8] : [r, SUBMARINE.esloraM - 2 * r, 8, 24]} />
      {ghost ? (
        <meshBasicMaterial color="#f1efe8" wireframe transparent opacity={0.28} />
      ) : (
        <meshStandardMaterial color="#cfd2cd" roughness={0.8} metalness={0.1} />
      )}
    </mesh>
  );
}

function DepthPlanes() {
  const geoms = useMemo(
    () =>
      depthMarkers.map((m) => {
        const s = 900;
        const g = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-s, 0, -s), new THREE.Vector3(s, 0, -s), new THREE.Vector3(s, 0, s), new THREE.Vector3(-s, 0, s),
        ]);
        return { m, g };
      }),
    [],
  );
  return (
    <>
      {geoms.map(({ m, g }) => (
        <lineLoop key={m.depthM} geometry={g} position={[0, -m.depthM, 0]}>
          <lineBasicMaterial color={m.certainty === 'hecho' ? '#f1efe8' : '#7cc4d8'} transparent opacity={m.depthM === WRECK_DEPTH_M ? 0 : 0.28} />
        </lineLoop>
      ))}
    </>
  );
}

function Rig({ depth }: { depth: number }) {
  const { camera, scene } = useThree();
  const look = useRef(new THREE.Vector3(0, -4, 0));
  const fogNear = useMemo(() => new THREE.Color('#0c2231'), []);
  const fogDeep = useMemo(() => new THREE.Color('#020507'), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const t = Math.min(1, depth / WRECK_DEPTH_M);
    const angle = THREE.MathUtils.lerp(0.75, 2.1, t);
    const radius = THREE.MathUtils.lerp(175, 150, t);
    const lift = THREE.MathUtils.lerp(26, 42, t);
    tmp.set(Math.cos(angle) * radius, -depth + lift, Math.sin(angle) * radius);
    const k = 1 - Math.exp(-dt * 5);
    camera.position.lerp(tmp, k);
    const targetY = depth < 4 ? -4 : Math.max(-WRECK_DEPTH_M, -depth - 60);
    tmp.set(0, targetY, 0);
    look.current.lerp(tmp, k);
    camera.lookAt(look.current);

    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog) {
      fog.color.copy(fogNear).lerp(fogDeep, THREE.MathUtils.smoothstep(depth, 0, 300));
      fog.density = THREE.MathUtils.lerp(0.0011, 0.0016, t);
      (scene.background as THREE.Color | null)?.copy(fog.color);
    }
  });
  return null;
}

function Scene({ depth, grid, exaggeration }: Props) {
  const terrain = useMemo(() => buildTerrain(grid, exaggeration), [grid, exaggeration]);
  const isobaths = useMemo(() => buildIsobaths(grid, exaggeration), [grid, exaggeration]);
  const surface = useMemo(() => new THREE.PlaneGeometry(30000, 30000), []);
  const light = THREE.MathUtils.lerp(1.4, 0.55, Math.min(1, depth / 300));

  return (
    <>
      <color attach="background" args={['#0c2231']} />
      <fogExp2 attach="fog" args={['#0c2231', 0.0011]} />
      <hemisphereLight args={['#9fb8c4', '#05090c', light]} />
      <directionalLight position={[400, 800, 300]} intensity={light * 0.8} />
      {/* Luz de lectura cerca del fondo: convención visual para ver el relieve, no una fuente real. */}
      <pointLight position={[0, -WRECK_DEPTH_M + 120, 0]} intensity={THREE.MathUtils.smoothstep(depth, 450, 800) * 1.4} distance={1600} decay={0} color="#cfe6ee" />

      <mesh geometry={surface} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <meshBasicMaterial color="#1c3b4b" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <Submarine y={-SUBMARINE.cascoResistenteAnchoM / 2 + 1} />
      <DepthPlanes />

      <mesh geometry={terrain}>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} flatShading />
      </mesh>
      <lineSegments geometry={isobaths}>
        <lineBasicMaterial color="#7cc4d8" transparent opacity={0.5} />
      </lineSegments>

      {/* Marcador del hallazgo y escala. No representa el estado ni la orientación de los restos. */}
      <group position={[0, -WRECK_DEPTH_M, 0]}>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[2.2, 16, 12]} />
          <meshBasicMaterial color="#f1efe8" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2, 0]}>
          <ringGeometry args={[18, 19.5, 48]} />
          <meshBasicMaterial color="#f1efe8" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
        <group position={[0, 0, 40]}>
          <Submarine y={SUBMARINE.cascoResistenteAnchoM / 2 + 1} ghost />
        </group>
      </group>

      <Rig depth={depth} />
    </>
  );
}

export default function DescentScene(props: Props) {
  return (
    <Canvas
      frameloop={props.active === false ? 'never' : 'always'}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 45, near: 0.5, far: 20000, position: [130, 26, 120] }}
      aria-label="Escena 3D: descenso desde la superficie hasta 907 metros sobre batimetría GEBCO"
      role="img"
    >
      <Scene {...props} />
    </Canvas>
  );
}
