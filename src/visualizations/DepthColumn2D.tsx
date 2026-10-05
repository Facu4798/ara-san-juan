import { useMemo } from 'react';
import type { Grid } from '../data/types';
import { depthMarkers, WRECK_DEPTH_M, SUBMARINE } from '../data/depth';
import { POS_HALLAZGO } from '../data/positions';
import { sampleGrid } from '../utils/loadData';
import { fmt0 } from '../utils/format';

/**
 * Alternativa 2D (sin WebGL o por elección): corte vertical a ESCALA REAL (1:1 horizontal/vertical)
 * de 2 km de ancho centrado en el hallazgo. Perfil del fondo: GEBCO 2020, eje oeste–este.
 */
export function DepthColumn2D({ depth, grid }: { depth: number; grid: Grid }) {
  const W = 2000;
  const H = 1000;
  const mPerDegLon = 111320 * Math.cos((POS_HALLAZGO.lat * Math.PI) / 180);

  const profile = useMemo(() => {
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 25) {
      const lon = POS_HALLAZGO.lon + (x - W / 2) / mPerDegLon;
      const elev = sampleGrid(grid, POS_HALLAZGO.lat, lon);
      pts.push(`${x},${-elev}`);
    }
    return `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
  }, [grid, mPerDegLon]);

  const subW = SUBMARINE.esloraM;
  const subH = SUBMARINE.cascoResistenteAnchoM;

  return (
    <svg className="depth2d" viewBox={`-150 -40 ${W + 210} ${H + 80}`} preserveAspectRatio="xMidYMid meet" role="img"
      aria-label={`Corte vertical a escala real. Profundidad actual ${fmt0(depth)} metros. El submarino mide ${SUBMARINE.esloraM} metros; el hallazgo está a ${WRECK_DEPTH_M} metros.`}>
      <defs>
        <linearGradient id="water2d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c2231" />
          <stop offset="0.35" stopColor="#051017" />
          <stop offset="1" stopColor="#020507" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="url(#water2d)" />
      <path d={profile} fill="#0e171c" stroke="rgba(124,196,216,0.5)" strokeWidth={2} />
      <line x1={0} x2={W} y1={0} y2={0} stroke="rgba(221,228,232,0.5)" strokeWidth={2} />

      {depthMarkers.map((m) => (
        <g key={m.depthM}>
          <line x1={0} x2={W} y1={m.depthM} y2={m.depthM} stroke={m.certainty === 'hecho' ? '#f1efe8' : '#7cc4d8'} strokeOpacity={0.3} strokeDasharray={m.certainty === 'hecho' ? undefined : '10 10'} strokeWidth={1.5} />
          <text x={W - 10} y={m.depthM - 8} textAnchor="end" fontSize={28} fill="#aab6bd" fontFamily="IBM Plex Mono, monospace">{m.depthM} m · {m.label}</text>
        </g>
      ))}

      {/* Submarino a escala en superficie y silueta de escala en el fondo */}
      <rect x={W / 2 - subW / 2} y={0} width={subW} height={subH} rx={subH / 2} fill="#cfd2cd" />
      <rect x={W / 2 - subW / 2} y={WRECK_DEPTH_M - subH} width={subW} height={subH} rx={subH / 2} fill="none" stroke="#f1efe8" strokeDasharray="4 3" />
      <circle cx={W / 2} cy={WRECK_DEPTH_M} r={6} fill="#f1efe8" />

      <line x1={-40} x2={W + 40} y1={depth} y2={depth} stroke="#f1efe8" strokeWidth={2} />
      <text x={-50} y={depth + 10} textAnchor="end" fontSize={34} fill="#f1efe8" fontFamily="IBM Plex Mono, monospace">{fmt0(depth)}</text>

      {[0, 250, 500, 750, 1000].map((x) => (
        <text key={x} x={x * 2} y={H + 36} textAnchor="middle" fontSize={26} fill="#74838c" fontFamily="IBM Plex Mono, monospace">{x === 500 ? 'hallazgo' : `${(x * 2 - 1000) / 1000} km`}</text>
      ))}
    </svg>
  );
}
