import { useState } from 'react';
import * as THREE from 'three';
import type { GeoData } from '../../utils/loadData';
import { useApp } from '../../app/appStore';
import { POS_0028, POS_CTBTO, POS_HALLAZGO } from '../../data/positions';
import { mapPoint } from '../geoFrame';
import { Label } from '../Label';
import { C, MapBase, Pin, Cities } from '../map/mapParts';
import { VESSEL, T_HALLAZGO, T_POI24, T_INICIO_2018 } from '../../explore/busqueda/busquedaModel';

/**
 * MÓDULO 3 · La búsqueda sobre el mapa 3D. Cada cuadrado es la posición del buque de búsqueda
 * en un parte oficial (no su recorrido ni la superficie relevada). Con la comparación activa,
 * el período A se dibuja en celeste y el B en blanco frío.
 */
const vec = (lat: number, lon: number) => new THREE.Vector3(...mapPoint(lat, lon));
const fmtD = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });

export function BusquedaWorld({ geo }: { geo: GeoData }) {
  const t = useApp((s) => s.busquedaT);
  const fase = useApp((s) => s.busquedaFase);
  const compare = useApp((s) => s.compare);
  const [hover, setHover] = useState<string | null>(null);

  const p0028 = vec(POS_0028.lat, POS_0028.lon);
  const ctbto = vec(POS_CTBTO.lat, POS_CTBTO.lon);
  const wreck = vec(POS_HALLAZGO.lat, POS_HALLAZGO.lon);
  const show2018 = fase !== '2017';

  const inRange = (v: number, r: [number, number]) => v >= r[0] && v < r[1];
  const visible = VESSEL.filter((v) => (compare ? inRange(v.t, compare.a) || inRange(v.t, compare.b) : show2018 && v.t <= t));

  return (
    <group>
      <MapBase geo={geo} detail graticuleOpacity={0.06} />
      <Cities ids={['comodoro', 'caleta-olivia', 'puerto-deseado']} size={4} />

      <Pin at={p0028} color={C.hecho} height={16} ring={5} dot={1.6} />
      <Label position={[p0028.x - 4, 17, p0028.z]} tone="hecho" align="right">00:28 · última coordenada</Label>
      <Pin at={ctbto} color={C.estimacion} height={12} ring={4} dot={1.4} />
      <Label position={[ctbto.x + 4, 13, ctbto.z]} tone="estimacion">10:51 · estimación acústica</Label>

      {visible.map((v, i) => {
        const [x, , z] = mapPoint(v.lat, v.lon);
        const color = compare ? (inRange(v.t, compare.a) ? C.estimacion : C.hecho) : C.busqueda;
        const recency = compare ? 1 : 0.4 + 0.6 * ((i + 1) / visible.length);
        const isHover = hover === v.id;
        return (
          <group key={v.id} position={[x, 1, z]}>
            <mesh
              onPointerOver={(e) => { e.stopPropagation(); setHover(v.id); }}
              onPointerOut={() => setHover((h) => (h === v.id ? null : h))}
            >
              <boxGeometry args={[isHover ? 6 : 4.4, 1.2, isHover ? 6 : 4.4]} />
              <meshBasicMaterial color={color} transparent opacity={recency} />
            </mesh>
            <Label position={[3, 2, 0]} tone="busqueda" show={isHover}>
              Seabed Constructor · {fmtD.format(v.t)}
              <br />
              <em>{v.textoFuente}</em>
            </Label>
          </group>
        );
      })}

      {(t >= T_POI24 || compare) && (
        <group position={[wreck.x, 0, wreck.z]}>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[7, 0.6, 1]} />
            <meshBasicMaterial color={C.hecho} />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[1, 0.6, 7]} />
            <meshBasicMaterial color={C.hecho} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.8, 0]}>
            <ringGeometry args={[5.5, 6.4, 48]} />
            <meshBasicMaterial color={C.hecho} transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <Label position={[-6, 3, -2]} tone="hecho" align="right">
            {t >= T_HALLAZGO || compare ? <><strong>Hallazgo</strong> · 17/11/2018 · 907 m</> : <><strong>Punto de interés 24</strong> · 15/11/2018, 22:15</>}
          </Label>
        </group>
      )}

      {!compare && fase !== '2018' && t < T_INICIO_2018 && (
        <Label position={[p0028.x + 30, 4, p0028.z + 60]} tone="referencia" align="center">
          búsqueda 2017: no se publicaron zonas ni recorridos
        </Label>
      )}
    </group>
  );
}
