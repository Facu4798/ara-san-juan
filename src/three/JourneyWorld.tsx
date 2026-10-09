import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { GeoData } from '../utils/loadData';
import { POS_0028, COAST_NEAREST_0028, HYPOTHESIS_SPEED, searchVesselPositions } from '../data/positions';
import { VOYAGE_TIMING, VOYAGE_LABEL, voyageStop } from '../data/route';
import { DIST } from '../data/distances';
import { LANDMARKS } from '../data/landmarks';
import { WRECK_DEPTH_M } from '../data/depth';
import { fmt0 } from '../utils/format';
import { storyStore, useStorySelector } from '../story/store';
import { ANCHOR } from '../journey/anchors';
import { T, D } from '../journey/timeline';
import { subAt, voyageFractions } from '../journey/subPath';
import { clamp, seg, frac } from '../journey/track';
import { cameraAt } from '../journey/camera';
import { localXZ } from './geoFrame';
import { OUT, BACK, along, trail } from './routePath';
import { Label } from './Label';
import { C, V3, MapBase, Pin, AcousticRings, HypothesisDisk, Cities } from './map/mapParts';
import { Ocean, Sky } from './Ocean';
import { HeroSub } from './HeroSub';
import { Lights44 } from './fx/Lights44';
import { MarineSnow } from './fx/MarineSnow';
import { Collapse } from './fx/Collapse';
import { Seabed, WreckSite, DepthPlanes } from './depthParts';
import { Silhouette, Landmarks } from './Landmarks';
import { terrainUniforms } from './terrain';
import { mapPoint } from './geoFrame';

/**
 * EL MUNDO ÚNICO DEL VIAJE (1 unidad = 1 km). Un solo mapa con relieve GEBCO 2020 real, el mar, el
 * submarino y las capas de datos que entran y salen a medida que el relato las necesita. No hay
 * cortes entre «mapa» y «profundidad»: el sitio del hallazgo es un grupo a escala 0,001 (m → km)
 * puesto sobre sus coordenadas, y el relieve se desexagera hasta 1:1 al acercarse.
 */
const hoursSince0028 = (iso: string) => (Date.parse(iso) - Date.parse(POS_0028.datetime!)) / 3.6e6;
const H_0719 = hoursSince0028('2017-11-15T07:19:00-03:00');
const H_1051 = hoursSince0028('2017-11-15T10:51:00-03:00');

const arr = (v: THREE.Vector3) => [v.x, v.y, v.z] as [number, number, number];

/** Límites (km) del recorte donde se dibuja la parcela fina del sitio: la grilla local ya cubre esa zona. */
function useHole(geo: GeoData) {
  return useMemo(() => {
    const g = geo.wreckLocal;
    const [x0] = localXZ(g.lats[0], g.lons[0]);
    const [x1] = localXZ(g.lats[0], g.lons[g.cols - 1]);
    const [, z0] = localXZ(g.lats[g.rows - 1], g.lons[0]);
    const [, z1] = localXZ(g.lats[0], g.lons[0]);
    const m = 150; // m de margen
    const w = ANCHOR.wreck;
    const v = new THREE.Vector4(w.x + (x0 + m) / 1000, w.x + (x1 - m) / 1000, w.z + (Math.min(z0, z1) + m) / 1000, w.z + (Math.max(z0, z1) - m) / 1000);
    return v;
  }, [geo]);
}

/** Tamaño de las marcas del mapa según la distancia de la cámara (siempre legibles, nunca gigantes). */
function usePinScale(t: number) {
  return Math.min(1, Math.max(0.012, cameraAt(t).dist / 700));
}

export function JourneyWorld({ geo }: { geo: GeoData }) {
  const tt = useStorySelector((s) => Math.round(s.t * 20));
  const t = tt / 20;
  const hole = useHole(geo);
  const site = useRef<THREE.Group>(null);

  useFrame(() => {
    terrainUniforms.uHole.value.copy(hole);
    if (site.current) site.current.visible = terrainUniforms.uTrue.value > 0.4;
  });

  const wreck = ANCHOR.wreck;
  const pinK = usePinScale(t);

  return (
    <group>
      <Sky />
      <MapBase geo={geo} detail={t > T.viaje + 3} graticuleOpacity={0.07} />
      <Ocean />

      <RouteLayer t={t} />
      <MarkLayer t={t} pinK={pinK} />
      <HypothesisLayer t={t} />
      <FindLayer t={t} pinK={pinK} />

      {/* Sitio del hallazgo: fondo real, siluetas de referencia y marca, a escala 1:1 (metros → km) */}
      <group ref={site} position={[wreck.x, 0, wreck.z]} scale={0.001}>
        <SiteLayer t={t} geo={geo} />
      </group>

      <HeroSub />
      <Lights44 />
      <MarineSnow />
      <Collapse />
    </group>
  );
}

// ——— Trazado del viaje ———

function RouteLayer({ t }: { t: number }) {
  const viaje = t >= T.viaje - 0.2 && t < T.c2342 + 1.6;
  if (!viaje) return null;
  const fine = storyStore.get().t;
  const { fOut, fBack, onBack } = voyageFractions(fine);
  const showTrail = fine >= T.viaje && fine < T.viaje + D.viaje + 0.3;
  const outTrail = showTrail ? trail(OUT, onBack ? 1 : fOut) : [];
  const backTrail = showTrail && onBack ? trail(BACK, fBack) : [];
  const fade = seg(fine, T.viaje + 0.9, T.viaje + 2.2) * (1 - seg(fine, T.c2342, T.c2342 + 1.5));
  const stop = voyageStop((fine - T.viaje) / D.viaje);
  const sub = subAt(fine);
  const routeLabelAt = along(OUT, 0.18).pos;
  const p = (fine - T.viaje) / D.viaje;
  return (
    <group>
      {fade > 0.01 && (
        <>
          <Line points={OUT.pts} color={C.trazado} lineWidth={1.1} dashed dashSize={16} gapSize={11} transparent opacity={0.28 * fade} />
          <Line points={BACK.pts} color={C.trazado} lineWidth={1.1} dashed dashSize={16} gapSize={11} transparent opacity={0.28 * fade} />
        </>
      )}
      {outTrail.length > 1 && <Line points={outTrail} color={C.trazado} lineWidth={1.8} dashed dashSize={16} gapSize={11} transparent opacity={0.95 * fade} />}
      {backTrail.length > 1 && <Line points={backTrail} color={C.trazado} lineWidth={1.8} dashed dashSize={16} gapSize={11} transparent opacity={0.95 * fade} />}
      {fade > 0.5 && fine < T.c2342 && (
        <>
          <Label position={[routeLabelAt.x - 30, 1, routeLabelAt.z]} tone="hipotesis" align="right">
            trazado esquemático
            <br />
            el recorrido real no fue publicado
          </Label>
          <Label position={[ANCHOR.mdp.x, 2, ANCHOR.mdp.z]} tone="hecho">
            <strong>Mar del Plata</strong> · {VOYAGE_LABEL.mdp.fecha}
          </Label>
          <Label position={[ANCHOR.ush.x, 2, ANCHOR.ush.z]} tone="hecho" show={p >= VOYAGE_TIMING.holdUshuaia[0] - 0.02}>
            <strong>Ushuaia</strong> · {VOYAGE_LABEL.ushuaia.fecha}
          </Label>
          <Label position={[sub.pos.x, 2, sub.pos.z + 120]} tone="hecho" align="center" show={stop === 'navegando-2' || stop === 'patrulla'}>
            <strong>{VOYAGE_LABEL[stop].fecha}</strong>
            <br />
            {VOYAGE_LABEL[stop].lugar}
          </Label>
          {[-38, -42, -46, -50, -54].map((lat) => (
            <Label key={lat} position={mapPoint(lat, -48.6, 0) as [number, number, number]} tone="referencia">
              {Math.abs(lat)}° S
            </Label>
          ))}
        </>
      )}
      <CityLayer t={fine} />
    </group>
  );
}

function CityLayer({ t }: { t: number }) {
  const overview = t >= T.viaje + 1.8 && t < T.c2342 + 0.3;
  const zoomed = t >= T.c2342 + 0.3 && t < T.c0600;
  return (
    <>
      {overview && <Cities ids={['buenos-aires', 'mar-del-plata', 'comodoro', 'ushuaia']} size={9} />}
      {zoomed && <Cities ids={['comodoro', 'caleta-olivia', 'puerto-deseado']} size={4} />}
    </>
  );
}

// ——— La última coordenada ———

function MarkLayer({ t, pinK }: { t: number; pinK: number }) {
  const p0028 = ANCHOR.p0028;
  const show = t >= T.c2342 + 1.2 && t < T.descenso - 0.6;
  const lines = t >= T.c0028 && t < T.c0600 + 0.6;
  const lineA = seg(t, T.c0028 + 0.5, T.c0028 + 1.2) * (1 - seg(t, T.c0600 - 0.2, T.c0600 + 0.5));
  const coastA = seg(t, T.c0028 + 0.8, T.c0028 + 1.5) * (1 - seg(t, T.c0600 - 0.2, T.c0600 + 0.5));
  const mdpA = seg(t, T.c0028 + 2.0, T.c0028 + 2.7) * (1 - seg(t, T.c0600 - 0.2, T.c0600 + 0.5));
  const coastPt = ANCHOR.coast;
  return (
    <group>
      {show && (
        <>
          <Pin at={p0028} color={C.hecho} height={34 * pinK} ring={9 * pinK} dot={2.6 * pinK} opacity={1 - seg(t, T.silencio + 3, T.silencio + 4.2)} />
          <Label position={[p0028.x + 6 * pinK, 36 * pinK, p0028.z]} tone="hecho" show={t < T.silencio + 3}>
            <strong>00:28</strong> · 46°44′ S · 60°08′ O
          </Label>
        </>
      )}
      {lines && (
        <>
          <Line points={[V3(POS_0028.lat, -67.6, 0.5), V3(POS_0028.lat, -55.5, 0.5)]} color={C.hecho} lineWidth={1} dashed dashSize={6} gapSize={6} transparent opacity={0.55 * lineA} />
          <Line points={[V3(-49.5, POS_0028.lon, 0.5), V3(-43.2, POS_0028.lon, 0.5)]} color={C.hecho} lineWidth={1} dashed dashSize={6} gapSize={6} transparent opacity={0.55 * lineA} />
          <Label position={V3(POS_0028.lat + 0.1, -62.9, 1).toArray() as [number, number, number]} tone="referencia" show={lineA > 0.5}>latitud 46°44′ S</Label>
          <Label position={V3(-44.6, POS_0028.lon + 0.08, 1).toArray() as [number, number, number]} tone="referencia" show={lineA > 0.5}>longitud 60°08′ O</Label>
          <Line points={[p0028.clone().setY(0.9), coastPt.clone().setY(0.9)]} color={C.hecho} lineWidth={1.8} transparent opacity={coastA} />
          <Label position={p0028.clone().lerp(coastPt, 0.5).setY(2).toArray() as [number, number, number]} tone="hecho" align="center" show={coastA > 0.6}>
            ≈ {fmt0(COAST_NEAREST_0028.km)} km a la costa
          </Label>
          <Line points={[p0028.clone().setY(0.9), ANCHOR.mdp.clone().setY(0.9)]} color={C.hecho} lineWidth={1.2} dashed dashSize={10} gapSize={7} transparent opacity={0.8 * mdpA} />
          <Label position={p0028.clone().lerp(ANCHOR.mdp, 0.22).setY(2).toArray() as [number, number, number]} tone="hecho" show={mdpA > 0.6}>
            {fmt0(DIST.mdp)} km a Mar del Plata ↗
          </Label>
        </>
      )}
    </group>
  );
}

// ——— Hipótesis de alcance ———

function HypothesisLayer({ t }: { t: number }) {
  const fine = storyStore.get().t;
  if (fine < T.c0719 + 0.8 || fine > T.descenso - 0.7) return null;
  const hours =
    fine < T.silencio
      ? H_0719 * seg(fine, T.c0719 + 0.8, T.c0719 + 2.4)
      : H_0719 + (H_1051 - H_0719) * frac(fine, T.silencio + 0.5, T.silencio + 6.2);
  const km = hours * HYPOTHESIS_SPEED.kmPorHora;
  if (km < 1) return null;
  void t;
  return <HypothesisDisk center={ANCHOR.p0028} radiusKm={km} hours={hours} label={fine < T.silencio + 5.2} />;
}

// ——— El hallazgo, el evento acústico y las distancias ———

function FindLayer({ t, pinK }: { t: number; pinK: number }) {
  const wreck = ANCHOR.wreck;
  const ctbto = ANCHOR.ctbto;
  const p0028 = ANCHOR.p0028;
  const secoPts = useMemo(() => searchVesselPositions.map((s) => ({ s, v: V3(s.lat, s.lon) })), []);
  // Durante el vuelo del silencio se anticipa la estimación acústica.
  const flight = t >= T.silencio + 4.6 && t < T.descenso - 0.5;
  const map = t >= T.distancia + 2.0;
  const a = seg(t, T.distancia + 2.0, T.distancia + 3.0);
  const small = map ? 1 : 0;
  void small;
  return (
    <group>
      {(flight || map) && (
        <>
          <Pin at={ctbto} color={C.estimacion} height={22 * pinK} ring={6 * pinK} dot={1.8 * pinK} opacity={flight ? seg(t, T.silencio + 4.6, T.silencio + 5.4) : 1} />
          {map && <AcousticRings at={ctbto} />}
          <Label position={[ctbto.x + 5 * pinK, 24 * pinK, ctbto.z]} tone="estimacion">
            10:51 · evento acústico <em>(estimación CTBTO)</em>
          </Label>
        </>
      )}
      {map && (
        <>
          {secoPts.map(({ s, v }) => (
            <mesh key={s.id} position={[v.x, 1, v.z]}>
              <boxGeometry args={[3.2, 1.2, 3.2]} />
              <meshBasicMaterial color={C.busqueda} transparent opacity={0.85 * a} />
            </mesh>
          ))}
          <group position={[wreck.x, 0, wreck.z]}>
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[9, 0.6, 1.2]} />
              <meshBasicMaterial color={C.hecho} transparent opacity={a} />
            </mesh>
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[1.2, 0.6, 9]} />
              <meshBasicMaterial color={C.hecho} transparent opacity={a} />
            </mesh>
            {/* 907 m a ESCALA REAL (el relieve ya está desexagerado) */}
            <Line points={[[3, 0.2, -3], [3, -WRECK_DEPTH_M / 1000, -3]]} color={C.hecho} lineWidth={4} depthTest={false} transparent opacity={a} />
          </group>
          <Line points={[p0028.clone().setY(1.2), wreck.clone().setY(1.2)]} color={C.hecho} lineWidth={1.6} dashed dashSize={4} gapSize={3} transparent opacity={a} />
          <Line points={[ctbto.clone().setY(1.2), wreck.clone().setY(1.2)]} color={C.estimacion} lineWidth={1.4} dashed dashSize={3} gapSize={2.5} transparent opacity={a} />
          {a > 0.5 && (
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
              <Label position={arr(p0028.clone().setY(2))} tone="hecho" align="right">
                <strong>00:28</strong> · última coordenada
              </Label>
            </>
          )}
        </>
      )}
    </group>
  );
}

// ——— El sitio del hallazgo (metros) ———

function SiteLayer({ t, geo }: { t: number; geo: GeoData }) {
  const descent = t >= T.descenso - 0.8 && t < T.colapso;
  const sub = subAt(storyStore.get().t);
  const obelisk = LANDMARKS[0];
  const comp = 1 - seg(t, T.descenso + 3.4, T.descenso + 5.2);
  const planes = t >= T.descenso + 1.6 && t < T.colapso + 0.3;
  const reveal = t >= T.hallazgo - 0.4;
  return (
    <>
      <Seabed geo={geo} />
      <DepthPlanes visible={planes} opacity={0.2} />
      {(descent || t >= T.colapso) && (
        <Landmarks
          cameraDepth={sub.depthM}
          showAll={t >= T.hallazgo}
          labels={(t >= T.descenso + 2.4 && t < T.colapso + 0.4) || (t >= T.hallazgo && t < T.distancia + 1.9)}
        />
      )}
      {t >= T.descenso - 0.8 && t < T.descenso + 5.4 && comp > 0.02 && (
        <>
          {/* Comparación inicial: el Obelisco acostado junto al submarino (67,5 m contra 65,93 m). */}
          <group position={[-obelisk.alturaM / 2 + 6, -13, 22]} rotation={[0, 0, -Math.PI / 2]}>
            <group position={[0, obelisk.alturaM / 2 - obelisk.alturaM / 2, 0]}>
              <Silhouette id="obelisco" height={obelisk.alturaM} baseM={obelisk.baseM} opacity={comp * 2.4} />
            </group>
          </group>
          <Label position={[0, 4, 0]} tone="hecho" align="center" show={comp > 0.5}>
            ARA San Juan · 65,9 m de eslora
          </Label>
          <Label position={[0, -12, 22]} tone="referencia" align="center" show={comp > 0.5}>
            Obelisco · 67,5 m (acostado, como referencia)
          </Label>
        </>
      )}
      {reveal && <WreckSite labels={t >= T.hallazgo + 0.8 && t < T.distancia + 1.9} scaleLabel={false} silhouette={false} />}
    </>
  );
}

void clamp;
