import { useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useApp, setApp } from '../../app/appStore';
import { SUBMARINE } from '../../data/depth';
import { SUB_PARTS } from '../../explore/travesia/subParts';
import { SubmarineModel, collapseUniform } from '../SubmarineModel';

/**
 * Submarino para inspeccionar (escala 1:1, en metros): el mismo modelo esquemático de la película.
 * Sólo la eslora (65,93 m) y el ancho del casco resistente (7 m) son datos. Las zonas proa / casco / popa
 * se resaltan al seleccionarlas con un marco; sus límites son convencionales.
 */
const L = SUBMARINE.esloraM;
const R = SUBMARINE.cascoResistenteAnchoM / 2;

/** Zona de cada parte sobre el modelo: [centro x, largo] (m); la vela se marca en su posición. */
const ZONES: Record<string, { cx: number; len: number; cy: number; h: number }> = {
  popa: { cx: (-L / 2 + -12) / 2, len: L / 2 - 12, cy: 0, h: 2 * R + 1.2 },
  casco: { cx: 3, len: 30, cy: 0, h: 2 * R + 1.2 },
  proa: { cx: (18 + L / 2) / 2, len: L / 2 - 18, cy: 0, h: 2 * R + 1.2 },
  vela: { cx: 8.5, len: 11.5, cy: R + 3.6, h: 7.4 },
};

export function SubStudio() {
  const selected = useApp((s) => s.selectedPart);
  useEffect(() => {
    collapseUniform.value = 0;
  }, []);
  const z = selected ? ZONES[selected] : null;

  return (
    <group>
      <hemisphereLight args={['#dfeef4', '#10242e', 1.1]} />
      <directionalLight position={[40, 60, 30]} intensity={1.6} />
      <directionalLight position={[-50, 20, -40]} intensity={0.5} />

      {/* Grilla de piso: 10 m por celda, para leer la escala. */}
      <gridHelper args={[160, 16, '#5d7a87', '#2a4654']} position={[0, -R - 2, 0]} />

      <SubmarineModel />

      {z && (
        <mesh position={[z.cx, z.cy, 0]}>
          <boxGeometry args={[z.len, z.h, 2 * R + 1.4]} />
          <meshBasicMaterial color="#70bbd8" wireframe transparent opacity={0.7} />
        </mesh>
      )}

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
