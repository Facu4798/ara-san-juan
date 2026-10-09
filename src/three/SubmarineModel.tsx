import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SUBMARINE } from '../data/depth';

/**
 * MODELO ESQUEMÁTICO del ARA San Juan, con la proa hacia +x y 1 unidad = 1 m.
 *
 * Datos usados: eslora 65,93 m y ancho del casco resistente 7 m (data/depth.ts). La vela, los
 * timones, la hélice y los mástiles son formas genéricas de un submarino convencional: NO
 * reproducen el diseño real ni el interior, y así se declara en pantalla. Es un único modelo
 * para todo el relato: se agranda como símbolo en el mapa (rotulado «no a escala») y llega a
 * 1:1 de cerca.
 */
const L = SUBMARINE.esloraM;
const R = SUBMARINE.cascoResistenteAnchoM / 2;

/** Radio del casco a lo largo de la eslora (x de −L/2 a L/2): proa redondeada, popa afinada. */
export function hullRadius(x: number) {
  const bowLen = 11;
  const sternLen = 24;
  if (x > L / 2 - bowLen) {
    const u = (x - (L / 2 - bowLen)) / bowLen;
    return R * Math.pow(Math.max(0, 1 - Math.pow(u, 2.3)), 0.5);
  }
  if (x < -L / 2 + sternLen) {
    const u = (x + L / 2) / sternLen; // 0 popa → 1 cuerpo central
    return R * (0.07 + 0.93 * Math.pow(Math.sin((u * Math.PI) / 2), 0.9));
  }
  return R;
}

export const collapseUniform = { value: 0 };

/** Deformación del casco hacia adentro: se aplica en el vértice, a todos los materiales del modelo. */
function withCollapse(m: THREE.MeshStandardMaterial) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uCollapse = collapseUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n uniform float uCollapse;')
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position);
         float ang = atan(position.z, position.y);
         float irr = 0.5 + 0.5 * sin(position.x * 0.33 + 1.3) * sin(ang * 3.0 + position.x * 0.17);
         float sq = 1.0 - uCollapse * (0.52 + 0.4 * irr);
         transformed.yz *= sq;
         transformed.x *= 1.0 - 0.07 * uCollapse;
         transformed.y += uCollapse * 1.5 * sin(position.x * 0.095);`,
      );
  };
  m.customProgramCacheKey = () => 'sub-collapse';
  return m;
}

/** Textura de baldosas anecoicas: una grilla muy tenue que da escala al casco. */
function tileBump() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#9a9a9a';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#4a4a4a';
  g.lineWidth = 4;
  g.strokeRect(2, 2, 124, 124);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

interface Parts {
  hull: THREE.BufferGeometry;
  sail: THREE.BufferGeometry;
  fins: THREE.BufferGeometry;
  prop: THREE.BufferGeometry;
  bronze: THREE.BufferGeometry;
}
let partsCache: Parts | null = null;

function buildParts(): Parts {
  // Casco por revolución (alrededor del eje x).
  const pts: THREE.Vector2[] = [];
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const x = -L / 2 + (L * i) / n;
    pts.push(new THREE.Vector2(Math.max(0.02, hullRadius(x)), x));
  }
  const hull = new THREE.LatheGeometry(pts, 56).rotateZ(-Math.PI / 2);
  // UV: u alrededor, v a lo largo → repite las baldosas (≈1,1 m de lado).
  const uv = hull.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 20, uv.getY(i) * 60);

  // Cubierta (casing) sobre el casco: franja baja y alargada.
  const casing = new THREE.CapsuleGeometry(1.15, 36, 6, 14).rotateZ(Math.PI / 2).scale(1, 0.34, 1.35).translate(-5, R * 0.93, 0);
  const hullAll = mergeGeometries([hull.toNonIndexed(), casing.toNonIndexed()])!;

  // Vela: perfil hidrodinámico extruido.
  const s = new THREE.Shape();
  s.moveTo(-5.4, 0);
  s.lineTo(-3.5, 5.5);
  s.quadraticCurveTo(-3.2, 6.45, -2.1, 6.45);
  s.lineTo(2.5, 6.45);
  s.quadraticCurveTo(3.9, 6.45, 4.4, 5.2);
  s.lineTo(5.5, 0);
  s.lineTo(-5.4, 0);
  const fair = new THREE.ExtrudeGeometry(s, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.45, bevelSize: 0.45, bevelSegments: 3, curveSegments: 12 })
    .translate(0, 0, -0.85)
    .translate(8.5, R * 0.8, 0);
  const mastA = new THREE.CylinderGeometry(0.11, 0.13, 3.4, 10).translate(9.6, R * 0.8 + 6.45 + 1.5, 0.25);
  const mastB = new THREE.CylinderGeometry(0.09, 0.1, 2.7, 10).translate(7.4, R * 0.8 + 6.45 + 1.15, -0.28);
  const mastC = new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8).translate(8.4, R * 0.8 + 6.45 + 0.8, 0.0);
  // Planos de la vela (formas genéricas).
  const planeA = new THREE.BoxGeometry(2.6, 0.18, 2.4).translate(10.2, R * 0.8 + 3.7, 0);
  const sail = mergeGeometries([fair.toNonIndexed(), mastA.toNonIndexed(), mastB.toNonIndexed(), mastC.toNonIndexed(), planeA.toNonIndexed()])!;

  // Timones de popa en cruz.
  const fin = () => {
    const f = new THREE.Shape();
    f.moveTo(0, 0);
    f.lineTo(3.2, 0);
    f.lineTo(2.2, 4.4);
    f.lineTo(0.5, 4.4);
    f.lineTo(0, 0);
    return new THREE.ExtrudeGeometry(f, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 2 }).translate(-1.6, 0.2, -0.12);
  };
  const fx = -L / 2 + 5.4;
  const f1 = fin().translate(fx, 0, 0);
  const f2 = fin().rotateX(Math.PI).translate(fx, 0, 0);
  const f3 = fin().rotateX(Math.PI / 2).translate(fx, 0, 0);
  const f4 = fin().rotateX(-Math.PI / 2).translate(fx, 0, 0);
  const fins = mergeGeometries([f1, f2, f3, f4].map((g) => g.toNonIndexed()))!;

  // Hélice de 5 palas (gira alrededor de x).
  const blades: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.SphereGeometry(1, 14, 10).scale(0.13, 1.55, 0.62);
    b.rotateY(0.55);
    b.translate(0, 1.55, 0);
    b.rotateX((i / 5) * Math.PI * 2);
    blades.push(b.toNonIndexed());
  }
  const hub = new THREE.CylinderGeometry(0.34, 0.5, 1.2, 14).rotateZ(Math.PI / 2);
  const cap = new THREE.ConeGeometry(0.34, 0.9, 14).rotateZ(Math.PI / 2).translate(-1.0, 0, 0);
  const prop = mergeGeometries([...blades, hub.toNonIndexed(), cap.toNonIndexed()])!;
  prop.translate(-L / 2 - 0.9, 0, 0);

  // Cúpula del sonar de proa y escotilla: detalles que rompen la silueta lisa.
  const dome = new THREE.SphereGeometry(1.7, 18, 12).scale(0.8, 1, 1).translate(L / 2 - 6.4, -0.6, 0);
  const hatch = new THREE.CylinderGeometry(0.9, 0.9, 0.22, 20).translate(-14, R * 0.93 + 0.4, 0);
  const bronze = mergeGeometries([dome.toNonIndexed(), hatch.toNonIndexed()])!;

  partsCache = { hull: hullAll, sail, fins, prop, bronze };
  return partsCache;
}

/** Estado visual del protagonista: lo escribe el director del viaje cada cuadro. */
export const heroLook = {
  /** 0 = sólido, 1 = fantasma (posición desconocida). */
  ghost: 0,
  /** 0 a 1: reconstrucción (acento ámbar). */
  recon: 0,
  opacity: 1,
  /** Rad/s de la hélice. */
  spin: 0,
  /** Resplandor rojizo tenue (aviso de avería). */
  alert: 0,
};

export function SubmarineModel({
  ghost = false,
  opacity = 1,
  hero = false,
}: {
  ghost?: boolean;
  opacity?: number;
  /** El protagonista del viaje: lee heroLook en cada cuadro. */
  hero?: boolean;
}) {
  const parts = partsCache ?? buildParts();
  const prop = useRef<THREE.Mesh>(null);
  const mats = useMemo(() => {
    const bump = tileBump();
    bump.repeat.set(1, 1);
    const base = (color: string, rough = 0.62, metal = 0.22) =>
      withCollapse(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
    const hull = base('#7e8f98');
    hull.bumpMap = bump;
    hull.bumpScale = 0.55;
    return {
      hull,
      sail: base('#8a9ba3'),
      fins: base('#6f808a'),
      prop: base('#b88b4a', 0.38, 0.75),
      bronze: base('#a9b5ba', 0.5, 0.35),
    };
  }, []);
  const all = Object.values(mats);

  const tint = useMemo(() => new THREE.Color(), []);
  const GHOST = useMemo(() => new THREE.Color('#9fd0e4'), []);
  const AMBER = useMemo(() => new THREE.Color('#d5a65d'), []);
  const ALERT = useMemo(() => new THREE.Color('#d77a6a'), []);

  const apply = (g: number, recon: number, o: number, alert: number) => {
    const op = o * (1 - 0.7 * g);
    for (const m of all) {
      m.transparent = op < 0.995;
      m.opacity = op;
      m.depthWrite = op > 0.6;
      m.emissive.copy(tint.set('#000000').lerp(GHOST, g * 0.55).lerp(AMBER, recon * 0.12).lerp(ALERT, alert * 0.7));
      m.emissiveIntensity = Math.max(g * 0.9, recon * 0.22, alert * 0.6);
      m.wireframe = false;
    }
  };

  // Versiones fijas (modelos de referencia fuera del viaje).
  useMemo(() => {
    if (!hero) apply(ghost ? 1 : 0, 0, opacity, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hero, ghost, opacity]);

  useFrame((_, dt) => {
    if (hero) {
      apply(heroLook.ghost, heroLook.recon, heroLook.opacity, heroLook.alert);
      if (prop.current) prop.current.rotation.x += heroLook.spin * Math.min(dt, 0.1);
    }
  });

  return (
    <group>
      <mesh geometry={parts.hull} material={mats.hull} />
      <mesh geometry={parts.sail} material={mats.sail} />
      <mesh geometry={parts.fins} material={mats.fins} />
      <mesh geometry={parts.bronze} material={mats.bronze} />
      <mesh ref={prop} geometry={parts.prop} material={mats.prop} />
    </group>
  );
}
