import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useApp, setApp } from '../../app/appStore';
import { SUBMARINE } from '../../data/depth';
import { SUB_PARTS } from '../../explore/travesia/subParts';

/**
 * Submarino para inspeccionar (escala 1:1, en metros). Forma ESQUEMÁTICA: sólo la eslora
 * (65,93 m) y el ancho del casco resistente (7 m) son datos. Las secciones proa / centro / popa
 * se resaltan al seleccionarlas; sus límites son convencionales.
 */
const L = SUBMARINE.esloraM;
const R = SUBMARINE.cascoResistenteAnchoM / 2;

/** Radio del casco a lo largo de la eslora (x de −L/2 a L/2): proa redondeada, popa afinada. */
function radiusAt(x: number) {
  const u = (x + L / 2) / L; // 0 popa → 1 proa
  if (u > 0.9) return R * Math.sqrt(Math.max(0, 1 - ((u - 0.9) / 0.1) ** 2));
  if (u < 0.22) return R * (0.12 + 0.88 * Math.sin(((u / 0.22) * Math.PI) / 2));
  return R;
}

function hullSection(x0: number, x1: number) {
  const pts: THREE.Vector2[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push(new THREE.Vector2(Math.max(0.001, radiusAt(x)), x));
  }
  // Lathe gira alrededor de Y: se rota para que la eslora quede sobre X.
  return new THREE.LatheGeometry(pts, 48).rotateZ(-Math.PI / 2);
}

const SECTIONS = {
  popa: [-L / 2, -12],
  casco: [-12, 18],
  proa: [18, L / 2],
} as const;

export function SubStudio() {
  const selected = useApp((s) => s.selectedPart);
  const geoms = useMemo(() => ({
    popa: hullSection(...SECTIONS.popa),
    casco: hullSection(...SECTIONS.casco),
    proa: hullSection(...SECTIONS.proa),
  }), []);

  const mat = (id: string) => (
    <meshStandardMaterial
      color={selected === id ? '#cfe9f3' : '#8ea3ad'}
      emissive={selected === id ? '#2f6f87' : '#000000'}
      emissiveIntensity={selected === id ? 0.6 : 0}
      roughness={0.6}
      metalness={0.25}
    />
  );

  return (
    <group>
      <hemisphereLight args={['#dfeef4', '#10242e', 1.1]} />
      <directionalLight position={[40, 60, 30]} intensity={1.6} />
      <directionalLight position={[-50, 20, -40]} intensity={0.5} />

      {/* Grilla de piso: 10 m por celda, para leer la escala. */}
      <gridHelper args={[160, 16, '#5d7a87', '#2a4654']} position={[0, -R - 2, 0]} />

      <mesh geometry={geoms.popa} onClick={(e) => { e.stopPropagation(); setApp({ selectedPart: 'popa' }); }}>{mat('popa')}</mesh>
      <mesh geometry={geoms.casco} onClick={(e) => { e.stopPropagation(); setApp({ selectedPart: 'casco' }); }}>{mat('casco')}</mesh>
      <mesh geometry={geoms.proa} onClick={(e) => { e.stopPropagation(); setApp({ selectedPart: 'proa' }); }}>{mat('proa')}</mesh>

      {/* Vela (forma genérica) */}
      <mesh position={[8, R + 3.2, 0]} onClick={(e) => { e.stopPropagation(); setApp({ selectedPart: 'vela' }); }}>
        <boxGeometry args={[11, 6.4, 2.4]} />
        {mat('vela')}
      </mesh>
      {/* Timones de popa en cruz y hélice (formas genéricas) */}
      <mesh position={[-L / 2 + 3, 0, 0]}>
        <boxGeometry args={[4, 2 * R + 4, 0.5]} />
        <meshStandardMaterial color="#7d919b" roughness={0.7} />
      </mesh>
      <mesh position={[-L / 2 + 3, 0, 0]}>
        <boxGeometry args={[4, 0.5, 2 * R + 4]} />
        <meshStandardMaterial color="#7d919b" roughness={0.7} />
      </mesh>
      <mesh position={[-L / 2 - 0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.6, 1.6, 0.4, 24]} />
        <meshStandardMaterial color="#6d828c" roughness={0.6} />
      </mesh>

      {/* Puntos interactivos */}
      {SUB_PARTS.map((p) => (
        <Html key={p.id} position={p.at} center zIndexRange={[6, 0]}>
          <button
            type="button"
            className={`hotspot${selected === p.id ? ' on' : ''}`}
            onClick={() => setApp({ selectedPart: selected === p.id ? null : p.id })}
            aria-pressed={selected === p.id}
          >
            <span className="dot" aria-hidden="true" />
            {p.nombre}
          </button>
        </Html>
      ))}
      <Html position={[0, -R - 7, 0]} center zIndexRange={[5, 0]}>
        <div className="lbl lbl-hipotesis lbl-center" style={{ transform: 'none' }}>
          ◇ MODELO ESQUEMÁTICO
          <br />
          datos: eslora 65,93 m y ancho del casco 7 m · grilla de 10 m
        </div>
      </Html>
    </group>
  );
}
