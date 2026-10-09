import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import { publishView } from './viewInfo';
import type { GeoData, ExploreData } from '../../utils/loadData';
import { appStore, useApp, type ModuleId } from '../../app/appStore';
import { mapPoint } from '../geoFrame';
import { ArgentinaWorld, provinceFrame } from './ArgentinaWorld';
import { TravesiaWorld, travesiaFocus } from './TravesiaWorld';
import { BusquedaWorld } from './BusquedaWorld';
import { DepthExplorerWorld, depthCameraTarget } from './DepthExplorerWorld';
import { comparisonAt } from '../../explore/profundidad/depthModel';
import { SubStudio } from './SubStudio';
import { PLACES } from '../../explore/vidas/crewModel';

/**
 * ESCENA DE EXPLORACIÓN LIBRE. Un mundo por módulo y una cámara controlable (órbita, zoom,
 * paneo) con transiciones suaves hacia lo que se selecciona.
 */

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const P = (lat: number, lon: number) => V(...mapPoint(lat, lon));

/** Vista inicial de cada módulo: [posición, punto de mira]. */
function homeView(m: ModuleId, subInspect: boolean): [THREE.Vector3, THREE.Vector3] {
  if (m === 'travesia' && subInspect) return [V(70, 28, 95), V(0, 0, 0)];
  switch (m) {
    case 'vidas': {
      const t = P(-38.8, -63.8);
      return [t.clone().add(V(0, 2350, 1500)), t];
    }
    case 'travesia': {
      const t = P(-46.5, -62.5);
      return [t.clone().add(V(0, 1700, 1350)), t];
    }
    case 'busqueda': {
      const t = P(-45.6, -59.6);
      return [t.clone().add(V(0, 420, 470)), t];
    }
    case 'profundidad':
      return [V(260, -10, 520), V(120, -40, 0)];
  }
}

const CLIP: Record<ModuleId, [number, number]> = {
  vidas: [2, 14000],
  travesia: [2, 14000],
  busqueda: [1, 12000],
  profundidad: [0.5, 9000],
};

function ExploreCamera() {
  const ref = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const module = useApp((s) => s.module);
  const subInspect = useApp((s) => s.subInspect);
  const resetKey = useApp((s) => s.viewResetKey);
  const focusProvince = useApp((s) => s.focusProvince);
  const selectedEventId = useApp((s) => s.selectedEventId);

  // Cambio de módulo o «restablecer vista».
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const near = subInspect ? 0.1 : CLIP[module][0];
    camera.near = near;
    camera.far = subInspect ? 2000 : CLIP[module][1];
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const [pos, target] = module === 'profundidad' ? depthHome() : homeView(module, subInspect);
    void c.setLookAt(pos.x, pos.y, pos.z, target.x, target.y, target.z, resetKey > 0);
    c.minDistance = subInspect ? 20 : module === 'profundidad' ? 60 : 40;
    c.maxDistance = subInspect ? 300 : module === 'profundidad' ? 1600 : 6000;
    c.maxPolarAngle = subInspect ? Math.PI : Math.PI * 0.47;
  }, [module, subInspect, resetKey, camera]);

  // Provincia elegida: la cámara se acerca suavemente.
  useEffect(() => {
    const c = ref.current;
    if (!c || module !== 'vidas' || !focusProvince) return;
    const f = provinceRegistry.get(focusProvince);
    if (!f) return;
    const { center, size } = f;
    const d = Math.max(950, size * 2.4);
    void c.setLookAt(center.x, d * 0.95, center.z + d * 0.7, center.x, 0, center.z, true);
  }, [focusProvince, module]);

  // Lugar de nacimiento elegido: la cámara se acerca a la columna.
  const selectedPlace = useApp((s) => s.selectedPlace);
  useEffect(() => {
    const c = ref.current;
    if (!c || module !== 'vidas' || !selectedPlace) return;
    const pl = PLACES.find((p) => p.key === selectedPlace);
    if (!pl) return;
    const t = P(pl.lat, pl.lon);
    void c.setLookAt(t.x, 900, t.z + 760, t.x, 30, t.z, true);
  }, [selectedPlace, module]);

  // Acontecimiento elegido en la travesía: la cámara se aproxima a su lugar, si lo tiene.
  useEffect(() => {
    const c = ref.current;
    if (!c || module !== 'travesia' || subInspect || !selectedEventId) return;
    const f = travesiaFocus(selectedEventId, appStore.get().travesiaT);
    if (!f) return;
    void c.setLookAt(f.pos.x, f.pos.y, f.pos.z, f.target.x, f.target.y, f.target.z, true);
  }, [selectedEventId, module, subInspect]);

  // Profundidad: la cámara baja con el control, conservando el ángulo que eligió el usuario.
  // Cuando aparece una comparación, se aleja lo necesario para mostrarla entera (base y punta).
  useEffect(() => {
    if (module !== 'profundidad') return;
    let lastCmp: string | null = null;
    return appStore.subscribe(() => {
      const c = ref.current;
      const s = appStore.get();
      if (!c || s.module !== 'profundidad') return;
      const cmp = comparisonAt(s.depth, s.pinComparison);
      const id = cmp && cmp.c.id !== 'hallazgo' ? cmp.c.id : null;
      const cur = c.getTarget(new THREE.Vector3());
      const pos = c.getPosition(new THREE.Vector3());
      const off = pos.clone().sub(cur);
      if (id && cmp) {
        const t = new THREE.Vector3(170, -cmp.c.depth / 2, 0);
        const dist = Math.max(420, cmp.c.depth * 1.45);
        if (id !== lastCmp) {
          off.setLength(dist);
          void c.setLookAt(t.x + off.x, t.y + off.y, t.z + off.z, t.x, t.y, t.z, true);
        }
        lastCmp = id;
        return;
      }
      if (lastCmp) off.setLength(Math.min(off.length(), 520));
      lastCmp = null;
      const t = depthCameraTarget(s.depth);
      if (Math.abs(cur.y - t.y) < 0.5 && off.length() <= 520.5) return;
      void c.setLookAt(t.x + off.x, t.y + off.y, t.z + off.z, t.x, t.y, t.z, true);
    });
  }, [module]);

  return (
    <>
      <CameraControls ref={ref} makeDefault smoothTime={0.6} dollyToCursor />
      <ViewProbe controls={ref} />
    </>
  );
}

/**
 * Mide la escala y la orientación de la vista en cada cuadro y las publica para la interfaz.
 *
 * Escala: a la distancia D del punto de mira, una cámara de perspectiva abarca
 * 2·D·tan(fov/2) unidades de alto; dividido por la altura del lienzo da las unidades por píxel.
 * Norte: el norte del marco del mapa es −z (geoFrame.ts). Se proyecta ese vector sobre los ejes
 * «derecha» y «arriba» de la cámara (columnas 0 y 1 de su matriz) y de ahí sale el ángulo en
 * pantalla. Hacerlo con la base de la cámara —y no con una proyección en perspectiva— mantiene
 * el valor estable también con la cámara inclinada o casi horizontal.
 */
function ViewProbe({ controls }: { controls: React.RefObject<CameraControls | null> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const c = controls.current;
    if (!c || !size.height) return;
    const d = camera.position.distanceTo(c.getTarget(tmp));
    if (d < 1e-6) return;
    const unitsPerPx = (2 * d * Math.tan(((camera.fov * Math.PI) / 180) / 2)) / size.height;

    const m = camera.matrixWorld.elements;
    const dx = -m[2]; // norte · eje derecha
    const dy = -m[6]; // norte · eje arriba
    const lean = Math.hypot(dx, dy);
    publishView({
      unitsPerPx,
      northDeg: lean < 1e-4 ? 0 : (Math.atan2(dx, dy) * 180) / Math.PI,
      northLean: Math.min(1, lean),
    });
  });
  return null;
}

function depthHome(): [THREE.Vector3, THREE.Vector3] {
  const t = depthCameraTarget(appStore.get().depth);
  return [t.clone().add(V(140, 30, 480)), t];
}

/** Encuadre de cada provincia (lo completa el mundo de Argentina al cargar los límites). */
export const provinceRegistry = new Map<string, { center: THREE.Vector3; size: number }>();

export function ExploreScene({ geo, data }: { geo: GeoData; data: ExploreData | null }) {
  const module = useApp((s) => s.module);
  const subInspect = useApp((s) => s.subInspect);

  useEffect(() => {
    if (!data) return;
    for (const f of data.provincias) provinceRegistry.set(f.properties.nombre, provinceFrame(f));
  }, [data]);

  return (
    <>
      {module === 'vidas' && data && <ArgentinaWorld geo={geo} data={data} />}
      {module === 'travesia' && !subInspect && <TravesiaWorld geo={geo} />}
      {module === 'travesia' && subInspect && <SubStudio />}
      {module === 'busqueda' && <BusquedaWorld geo={geo} />}
      {module === 'profundidad' && <DepthExplorerWorld geo={geo} />}
      <ExploreCamera />
    </>
  );
}
