import { useState } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { GeoData } from '../../utils/loadData';
import { useApp, setApp } from '../../app/appStore';
import { POS_0028, POS_CTBTO, POS_HALLAZGO, positionById } from '../../data/positions';
import { events } from '../../data/events';
import { DIST } from '../../data/distances';
import { fmt0 } from '../../utils/format';
import { mapPoint } from '../geoFrame';
import { OUT, BACK, along, trail } from '../routePath';
import { SubmarineModel } from '../SubmarineModel';
import { Label } from '../Label';
import { C, MapBase, Pin, AcousticRings, HypothesisDisk, Cities } from '../map/mapParts';
import { subAt, hypothesisAt, T_0028, T_1051, T_USHUAIA_IN, T_ZARPE } from '../../explore/travesia/travesiaModel';

/**
 * MÓDULO 2 · La última travesía sobre el mapa 3D (relieve y batimetría GEBCO).
 * Todo se calcula desde el instante elegido en la línea de tiempo y las capas activas.
 */
const vec = (lat: number, lon: number, y = 0) => new THREE.Vector3(...mapPoint(lat, lon)).setY(y);

/** Posición del submarino-símbolo en el instante t (o null si es desconocida). */
function subPosition(t: number) {
  const s = subAt(t);
  if (s.leg === 'mdp') return { ...along(OUT, 0), s };
  if (s.leg === 'ida') return { ...along(OUT, s.f), s };
  if (s.leg === 'ushuaia') return { ...along(OUT, 1), s };
  if (s.leg === 'vuelta') return { ...along(BACK, s.f), s };
  if (s.leg === 'en-0028') return { pos: vec(POS_0028.lat, POS_0028.lon, 0.8), yaw: 0.3, index: 0, s };
  return { pos: vec(POS_0028.lat, POS_0028.lon, 0.8), yaw: 0.3, index: 0, s };
}

/** Encuadre de cámara para un acontecimiento (si tiene lugar asociado o si es posterior a las 00:28). */
export function travesiaFocus(eventId: string, t: number) {
  const e = events.find((x) => x.id === eventId);
  if (!e) return null;
  const et = Date.parse(e.datetime);
  let target: THREE.Vector3 | null = null;
  let dist = 520;
  if (e.positionId) {
    const p = e.positionId === 'ctbto' ? POS_CTBTO : positionById.get(e.positionId);
    if (p) target = vec(p.lat, p.lon);
    if (e.positionId === 'ushuaia' || e.positionId === 'mar-del-plata') dist = 900;
  } else if (et >= T_0028 - 3600_000) {
    target = vec(POS_0028.lat + 0.2, POS_0028.lon + 0.2);
    dist = 560;
  } else {
    target = subPosition(et).pos.clone().setY(0);
    dist = 1100;
  }
  void t;
  if (!target) return null;
  return { target, pos: target.clone().add(new THREE.Vector3(0, dist * 0.85, dist * 0.8)) };
}

export function TravesiaWorld({ geo }: { geo: GeoData }) {
  const t = useApp((s) => s.travesiaT);
  const layers = useApp((s) => s.layers);
  const [hoverSub, setHoverSub] = useState(false);

  const sub = subPosition(t);
  const known = sub.s.certainty !== 'desconocido';
  const hyp = hypothesisAt(t);
  const p0028 = vec(POS_0028.lat, POS_0028.lon);
  const ctbto = vec(POS_CTBTO.lat, POS_CTBTO.lon);
  const wreck = vec(POS_HALLAZGO.lat, POS_HALLAZGO.lon);
  const mdp = positionById.get('mar-del-plata')!;
  const ush = positionById.get('ushuaia')!;

  // Estela iluminada hasta el instante actual (sobre el trazado completo, más tenue).
  const outF = t <= T_ZARPE ? 0 : Math.min(1, sub.s.leg === 'ida' ? sub.s.f : t >= T_USHUAIA_IN ? 1 : 0);
  const backF = sub.s.leg === 'vuelta' ? sub.s.f : t >= T_0028 ? 1 : 0;

  return (
    <group>
      <MapBase geo={geo} detail={t >= T_0028 - 6 * 3600_000} bathymetry={layers.batimetria} graticuleOpacity={0.08} />
      <Cities ids={['buenos-aires', 'mar-del-plata', 'comodoro', 'caleta-olivia', 'puerto-deseado', 'ushuaia']} size={6} />

      {layers.trazado && (
        <>
          <Line points={OUT.pts} color={C.trazado} lineWidth={1.2} dashed dashSize={16} gapSize={11} transparent opacity={0.35} />
          <Line points={BACK.pts} color={C.trazado} lineWidth={1.2} dashed dashSize={16} gapSize={11} transparent opacity={0.35} />
          {outF > 0 && <Line points={trail(OUT, outF)} color={C.trazado} lineWidth={2} dashed dashSize={16} gapSize={11} />}
          {backF > 0 && <Line points={trail(BACK, backF)} color={C.trazado} lineWidth={2} dashed dashSize={16} gapSize={11} />}
          <Label position={along(OUT, 0.18).pos.clone().add(new THREE.Vector3(-30, 1, 0)).toArray() as [number, number, number]} tone="hipotesis" align="right">
            trazado esquemático
            <br />
            el recorrido real no fue publicado
          </Label>
        </>
      )}

      {layers.posiciones && (
        <>
          <Pin at={vec(mdp.lat, mdp.lon)} color={C.hecho} height={22} ring={7} dot={2.4} />
          <Label position={[...mapPoint(mdp.lat, mdp.lon)].map((v, i) => (i === 1 ? 24 : v)) as [number, number, number]} tone="hecho">
            <strong>Mar del Plata</strong> · zarpe 25/10/2017
          </Label>
          <Pin at={vec(ush.lat, ush.lon)} color={C.hecho} height={22} ring={7} dot={2.4} />
          <Label position={[...mapPoint(ush.lat, ush.lon)].map((v, i) => (i === 1 ? 24 : v)) as [number, number, number]} tone="hecho">
            <strong>Ushuaia</strong> · 4 al 8/11/2017
          </Label>
          {t >= T_0028 && (
            <>
              <Pin at={p0028} color={C.hecho} />
              <Label position={[p0028.x + 6, 36, p0028.z]} tone="hecho">
                <strong>00:28</strong> · 46°44′ S · 60°08′ O · última posición publicada
              </Label>
            </>
          )}
        </>
      )}

      {/* Submarino-símbolo (no a escala): se puede seleccionar para inspeccionarlo. */}
      {known && (
        <group
          position={[sub.pos.x, 0.8, sub.pos.z]}
          rotation={[0, sub.yaw, 0]}
          onClick={(e) => { e.stopPropagation(); setApp({ subInspect: true, selectedPart: null }); }}
          onPointerOver={(e) => { e.stopPropagation(); setHoverSub(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHoverSub(false); document.body.style.cursor = ''; }}
        >
          <group scale={1.4}>
            <SubmarineModel />
          </group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
            <ringGeometry args={[52, 57, 64]} />
            <meshBasicMaterial color={hoverSub ? '#ffffff' : C.hecho} transparent opacity={hoverSub ? 0.9 : 0.55} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <Label position={[0, 10, 70]} tone={sub.s.certainty === 'hecho' ? 'hecho' : 'hipotesis'} align="center" show>
            {hoverSub ? 'Ver el submarino en 3D' : sub.s.texto}
            <br />
            <em>símbolo, no a escala</em>
          </Label>
        </group>
      )}
      {!known && (
        <Label position={[p0028.x - 8, 6, p0028.z + 30]} tone="referencia" align="right">
          posición desconocida desde las 00:28
        </Label>
      )}

      {layers.hipotesis && hyp && hyp.km > 1 && <HypothesisDisk center={p0028} radiusKm={hyp.km} hours={hyp.hours} />}

      {layers.acustico && t >= T_1051 && (
        <>
          <Pin at={ctbto} color={C.estimacion} height={22} ring={6} />
          <AcousticRings at={ctbto} />
          <Label position={[ctbto.x + 6, 24, ctbto.z]} tone="estimacion">
            10:51 · evento acústico <em>(estimación CTBTO)</em>
          </Label>
        </>
      )}

      {layers.hallazgo && (
        <>
          <group position={[wreck.x, 0, wreck.z]}>
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[9, 0.6, 1.2]} />
              <meshBasicMaterial color={C.hecho} />
            </mesh>
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[1.2, 0.6, 9]} />
              <meshBasicMaterial color={C.hecho} />
            </mesh>
          </group>
          <Line points={[p0028.clone().setY(1.2), wreck.clone().setY(1.2)]} color={C.hecho} lineWidth={1.2} dashed dashSize={4} gapSize={3} transparent opacity={0.8} />
          <Label position={[wreck.x + 6, 3, wreck.z - 6]} tone="hecho">
            <strong>Restos</strong> · 17/11/2018 · 907 m
            <br />
            {fmt0(DIST.wreck)} km de la coordenada de las 00:28
          </Label>
        </>
      )}
    </group>
  );
}
