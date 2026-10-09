import { SUBMARINE } from '../data/depth';

/**
 * Modelo ESQUEMÁTICO del ARA San Juan, con proa hacia +x.
 * Datos usados: eslora 65,93 m y diámetro del casco resistente 7 m. La vela y los timones
 * son formas genéricas para que se lea como submarino: no reproducen el diseño real ni el
 * interior. En el mapa se usa como símbolo, escalado y rotulado «no a escala».
 */
export function SubmarineModel({ ghost = false, opacity = 1 }: { ghost?: boolean; opacity?: number }) {
  const r = SUBMARINE.cascoResistenteAnchoM / 2;
  const L = SUBMARINE.esloraM;
  const mat = ghost ? (
    <meshBasicMaterial color="#e6eef1" wireframe transparent opacity={0.35 * opacity} depthWrite={false} />
  ) : (
    <meshStandardMaterial color="#c9d0d1" roughness={0.75} metalness={0.15} transparent={opacity < 1} opacity={opacity} />
  );
  return (
    <group>
      {/* Casco */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[r, L - 2 * r, 6, 20]} />
        {mat}
      </mesh>
      {/* Vela (forma genérica) */}
      <mesh position={[L * 0.12, r + 3, 0]}>
        <boxGeometry args={[10, 6, 2.2]} />
        {mat}
      </mesh>
      {/* Timón de popa (forma genérica) */}
      <mesh position={[-L / 2 + 2, 0, 0]}>
        <boxGeometry args={[4, 2 * r + 3, 0.6]} />
        {mat}
      </mesh>
    </group>
  );
}
