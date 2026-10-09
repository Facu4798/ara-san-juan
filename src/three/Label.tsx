import type { ReactNode } from 'react';
import { Html } from '@react-three/drei';

/**
 * Rótulo HTML anclado a un punto 3D. Se usa HTML (no texto 3D) para que sea nítido,
 * accesible y no dependa de fuentes externas.
 */
export function Label({
  position,
  children,
  tone = 'hecho',
  align = 'left',
  show = true,
}: {
  position: [number, number, number];
  children: ReactNode;
  tone?: 'hecho' | 'estimacion' | 'hipotesis' | 'busqueda' | 'referencia' | 'alerta';
  align?: 'left' | 'center' | 'right';
  show?: boolean;
}) {
  if (!show) return null;
  return (
    <Html position={position} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`lbl lbl-${tone} lbl-${align}`}>{children}</div>
    </Html>
  );
}
