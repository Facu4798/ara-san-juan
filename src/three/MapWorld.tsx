import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { GeoData } from '../utils/loadData';
import {
  POS_0028, POS_CTBTO, POS_HALLAZGO, COAST_NEAREST_0028, HYPOTHESIS_SPEED,
  searchVesselPositions, positionById,
} from '../data/positions';
import { VOYAGE_TIMING, VOYAGE_LABEL, voyageStop } from '../data/route';
import { DIST } from '../data/distances';
import { WRECK_DEPTH_M } from '../data/depth';
import { fmt0 } from '../utils/format';
import { mapPoint } from './geoFrame';
import { OUT, BACK, voyageAt, trail, along } from './routePath';
import { SubmarineModel } from './SubmarineModel';
import { Label } from './Label';
import { C, V3, MapBase, Pin, AcousticRings, HypothesisDisk, Cities } from './map/mapParts';

/**
 * MAPA DE LA HISTORIA GUIADA (1 unidad = 1 km). Relieve real GEBCO 2020 de tierra y mar,
 * exagerado en vertical (se declara en pantalla). Cada capa aparece sólo en los momentos que
 * la necesitan: el mapa nunca muestra más de lo que el texto explica en ese instante.
 */

const smooth = (t: number) => t * t * (3 - 2 * t);
const seg = (p: number, a: number, b: number) => smooth(Math.min(1, Math.max(0, (p - a) / (b - a))));
const hoursSince0028 = (iso: string) => (Date.parse(iso) - Date.parse(POS_0028.datetime!)) / 3.6e6;

// ——— Mundo ———

export function MapWorld({ geo, beatId, p, active }: { geo: GeoData; beatId: string; p: number; active: boolean }) {

  const p0028 = useMemo(() => V3(POS_0028.lat, POS_0028.lon), []);
  const ctbto = useMemo(() => V3(POS_CTBTO.lat, POS_CTBTO.lon), []);
  const wreck = useMemo(() => V3(POS_HALLAZGO.lat, POS_HALLAZGO.lon), []);
  const coastPt = useMemo(() => V3(COAST_NEAREST_0028.lat, COAST_NEAREST_0028.lon), []);
  const mdp = positionById.get('mar-del-plata')!;
  const mdpPt = useMemo(() => V3(mdp.lat, mdp.lon), [mdp]);
  const ush = positionById.get('ushuaia')!;
  const ushPt = useMemo(() => V3(ush.lat, ush.lon), [ush]);
  const secoPts = useMemo(() => searchVesselPositions.map((s) => ({ s, v: V3(s.lat, s.lon) })), []);

  const is = (...ids: string[]) => ids.includes(beatId);
  const overview = is('contexto', 'viaje');
  const zoomed = is('c2342', 'c0028', 'c0600', 'c0719', 'silencio', 'distancia');

  // ——— Viaje ———
  const voyage = is('viaje') ? voyageAt(p) : null;
  const subVisible = is('viaje', 'c0028', 'c0600', 'c0719') || (is('silencio') && p < 0.15);
  const subAt = voyage ? voyage.pos : new THREE.Vector3(p0028.x, 0.8, p0028.z);
  const subYaw = voyage ? voyage.yaw : 0.2;
  const subOpacity = is('silencio') ? 1 - seg(p, 0, 0.15) : 1;
  const outTrail = voyage ? trail(OUT, voyage.fOut) : OUT.pts;
  const backTrail = voyage ? trail(BACK, voyage.fBack) : BACK.pts;
  const showRoute = is('viaje', 'c2342');
  const routeOpacity = is('viaje') ? 0.95 : 0.35;
  const stop = voyageStop(p);
  const routeLabelAt = along(OUT, 0.18).pos;

  // ——— Hipótesis de alcance ———
  let hypHours = 0;
  if (is('c0719')) hypHours = hoursSince0028('2017-11-15T07:19:00-03:00') * seg(p, 0.45, 0.75);
  if (is('silencio')) {
    const h0 = hoursSince0028('2017-11-15T07:19:00-03:00');
    const h1 = hoursSince0028('2017-11-15T10:51:00-03:00');
    hypHours = h0 + (h1 - h0) * Math.min(1, p / 0.8);
  }
  const hypKm = hypHours * HYPOTHESIS_SPEED.kmPorHora;

  const showP0028 = is('c0028', 'c0600', 'c0719', 'silencio', 'distancia');
  const showCtbto = (is('silencio') && p > 0.62) || is('distancia');

  return (
    <group>
      <MapBase geo={geo} detail={zoomed} graticuleOpacity={overview ? 0.1 : 0.06} />

      {active && overview &&
        [-38, -42, -46, -50, -54].map((lat) => (
          <Label key={lat} position={mapPoint(lat, -48.6, 0) as [number, number, number]} tone="referencia">
            {Math.abs(lat)}° S
          </Label>
        ))}
      {active && is('contexto') && (
        <Label position={mapPoint(-41.2, -57.2, 0) as [number, number, number]} tone="referencia">
          borde de la plataforma (200 m)
        </Label>
      )}

      {/* Ciudades de referencia */}
      {active && overview && <Cities ids={['buenos-aires', 'mar-del-plata', 'comodoro', 'ushuaia']} size={9} />}
      {active && zoomed && <Cities ids={['comodoro', 'caleta-olivia', 'puerto-deseado']} size={4} />}

      {/* Trazado esquemático del viaje (rotulado como tal) */}
      {showRoute && outTrail.length > 1 && (
        <Line points={outTrail} color={C.trazado} lineWidth={1.6} dashed dashSize={16} gapSize={11} transparent opacity={routeOpacity} />
      )}
      {showRoute && backTrail.length > 1 && (
        <Line points={backTrail} color={C.trazado} lineWidth={1.6} dashed dashSize={16} gapSize={11} transparent opacity={routeOpacity} />
      )}
      {active && is('viaje') && (
        <>
          <Label position={[routeLabelAt.x - 30, 1, routeLabelAt.z]} tone="hipotesis" align="right">
            trazado esquemático
            <br />
            el recorrido real no fue publicado
          </Label>
          <Label position={[mdpPt.x, 2, mdpPt.z]} tone="hecho">
            <strong>Mar del Plata</strong> · {VOYAGE_LABEL.mdp.fecha}
          </Label>
          <Label position={[ushPt.x, 2, ushPt.z]} tone="hecho" show={p >= VOYAGE_TIMING.holdUshuaia[0] - 0.02}>
            <strong>Ushuaia</strong> · {VOYAGE_LABEL.ushuaia.fecha}
          </Label>
          <Label position={[subAt.x, 2, subAt.z + 120]} tone="hecho" align="center" show={stop === 'navegando-2' || stop === 'patrulla'}>
            <strong>{VOYAGE_LABEL[stop].fecha}</strong>
            <br />
            {VOYAGE_LABEL[stop].lugar}
          </Label>
        </>
      )}

      {/* Submarino-símbolo (no a escala) */}
      {subVisible && (
        <group position={[subAt.x, 0.8, subAt.z]} rotation={[0, subYaw, 0]}>
          {/* Modelo en metros, mapa en km: ~72 km de largo durante el viaje, ~33 km al acercarse. */}
          <group scale={voyage ? 1.6 : 0.5}>
            <SubmarineModel opacity={subOpacity} />
          </group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
            <ringGeometry args={voyage ? [58, 63, 64] : [22, 24, 64]} />
            <meshBasicMaterial color={C.hecho} transparent opacity={0.6 * subOpacity} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* 00:28 · la última coordenada y su lectura */}
      {showP0028 && (is('distancia') ? <Pin at={p0028} color={C.hecho} height={5} ring={2.6} dot={0.9} /> : <Pin at={p0028} color={C.hecho} />)}
      {active && showP0028 && !is('distancia') && (
        <Label position={[p0028.x + 6, 36, p0028.z]} tone="hecho">
          <strong>00:28</strong> · 46°44′ S · 60°08′ O
        </Label>
      )}
      {active && is('distancia') && (
        <Label position={[p0028.x - 3, 6, p0028.z]} tone="hecho" align="right">
          <strong>00:28</strong> · última coordenada
        </Label>
      )}
      {is('c0028') && p > 0.15 && (
        <>
          <Line points={[V3(POS_0028.lat, -67.6, 0.5), V3(POS_0028.lat, -55.5, 0.5)]} color={C.hecho} lineWidth={1} dashed dashSize={6} gapSize={6} transparent opacity={0.55 * seg(p, 0.15, 0.3)} />
          <Line points={[V3(-49.5, POS_0028.lon, 0.5), V3(-43.2, POS_0028.lon, 0.5)]} color={C.hecho} lineWidth={1} dashed dashSize={6} gapSize={6} transparent opacity={0.55 * seg(p, 0.15, 0.3)} />
          {active && (
            <>
              <Label position={V3(POS_0028.lat + 0.1, -62.9, 1).toArray() as [number, number, number]} tone="referencia">latitud 46°44′ S</Label>
              <Label position={V3(-44.6, POS_0028.lon + 0.08, 1).toArray() as [number, number, number]} tone="referencia">longitud 60°08′ O</Label>
            </>
          )}
          <Line points={[p0028.clone().setY(0.9), coastPt.clone().setY(0.9)]} color={C.hecho} lineWidth={1.8} transparent opacity={seg(p, 0.2, 0.35)} />
          {active && (
            <Label position={p0028.clone().lerp(coastPt, 0.5).setY(2).toArray() as [number, number, number]} tone="hecho" align="center" show={p > 0.22}>
              ≈ {fmt0(COAST_NEAREST_0028.km)} km a la costa
            </Label>
          )}
          {p > 0.45 && (
            <>
              <Line points={[p0028.clone().setY(0.9), mdpPt.clone().setY(0.9)]} color={C.hecho} lineWidth={1.2} dashed dashSize={10} gapSize={7} transparent opacity={0.8 * seg(p, 0.45, 0.6)} />
              {active && (
                <Label position={p0028.clone().lerp(mdpPt, 0.22).setY(2).toArray() as [number, number, number]} tone="hecho">
                  {fmt0(DIST.mdp)} km a Mar del Plata ↗
                </Label>
              )}
            </>
          )}
        </>
      )}

      {/* Hipótesis rotulada: alcance a 5 nudos (no es una posición) */}
      {hypKm > 1 && <HypothesisDisk center={p0028} radiusKm={hypKm} hours={hypHours} />}

      {/* 10:51 · evento acústico (estimación) */}
      {showCtbto && (
        <>
          {is('distancia') ? <Pin at={ctbto} color={C.estimacion} height={4} ring={2.2} dot={0.8} /> : <Pin at={ctbto} color={C.estimacion} height={22} ring={6} />}
          {is('silencio') && <AcousticRings at={ctbto} />}
          {active && (
            <Label position={is('distancia') ? [ctbto.x + 3, 5, ctbto.z] : [ctbto.x + 6, 24, ctbto.z]} tone="estimacion">
              10:51 · {is('distancia') ? 'estimación acústica' : <>evento acústico <em>(estimación CTBTO)</em></>}
            </Label>
          )}
        </>
      )}

      {/* Hallazgo, distancias y búsqueda 2018 */}
      {is('distancia') && (
        <>
          {secoPts.map(({ s, v }) => (
            <mesh key={s.id} position={[v.x, 1, v.z]}>
              <boxGeometry args={[3.2, 1.2, 3.2]} />
              <meshBasicMaterial color={C.busqueda} transparent opacity={0.85} />
            </mesh>
          ))}
          <group position={[wreck.x, 0, wreck.z]}>
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[9, 0.6, 1.2]} />
              <meshBasicMaterial color={C.hecho} />
            </mesh>
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[1.2, 0.6, 9]} />
              <meshBasicMaterial color={C.hecho} />
            </mesh>
            {/* 907 m a ESCALA REAL (sin la exageración del relieve) */}
            <Line points={[[3, 0.2, -3], [3, -WRECK_DEPTH_M / 1000, -3]]} color={C.hecho} lineWidth={4} depthTest={false} />
          </group>
          <Line points={[p0028.clone().setY(1.2), wreck.clone().setY(1.2)]} color={C.hecho} lineWidth={1.6} dashed dashSize={4} gapSize={3} />
          <Line points={[ctbto.clone().setY(1.2), wreck.clone().setY(1.2)]} color={C.estimacion} lineWidth={1.4} dashed dashSize={3} gapSize={2.5} />
          {active && (
            <>
              <Label position={[wreck.x - 6, 2, wreck.z - 2]} tone="hecho" align="right">
                <strong>Restos</strong> · 17/11/2018
              </Label>
              <Label position={[wreck.x + 5, -0.4, wreck.z - 3]} tone="hecho">← 907 m a escala real</Label>
              <Label position={p0028.clone().lerp(wreck, 0.5).setY(2).add(new THREE.Vector3(-3, 0, 0)).toArray() as [number, number, number]} tone="hecho" align="right">
                <strong>{fmt0(DIST.wreck)} km</strong>
              </Label>
              <Label position={ctbto.clone().lerp(wreck, 0.5).setY(2).add(new THREE.Vector3(3, 0, 0)).toArray() as [number, number, number]} tone="estimacion">
                {fmt0(DIST.wreckCtbto)} km
              </Label>
            </>
          )}
        </>
      )}

    </group>
  );
}

