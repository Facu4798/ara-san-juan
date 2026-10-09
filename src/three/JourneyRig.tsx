import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { beats } from '../story/beats';
import { storyStore } from '../story/store';
import { cameraAt, cameraPosition, clipFor, trueScaleAt } from '../journey/camera';
import { envAt } from '../journey/env';
import { live } from '../journey/live';
import { subAt } from '../journey/subPath';
import { seg, smoothDamp, wobble, type Damp } from '../journey/track';
import { terrainUniforms } from './terrain';
import { oceanLook, skyLook } from './Ocean';
import { heroLook } from './SubmarineModel';
import { T } from '../journey/timeline';
import { beginDrag, canDrag, dragBy, endDrag, resetLook, tickLook, zoomBy, lookStore } from '../journey/freeLook';

/**
 * DIRECTOR DEL VIAJE: cada cuadro lee el tiempo suavizado del relato y coloca la cámara, el entorno
 * (agua, niebla, luces), el relieve (exageración) y el mar. Es el único lugar que toca la cámara.
 */
const D2R = Math.PI / 180;
const BG_DAY = new THREE.Color('#d6e6ec');
const GROUND = new THREE.Color('#0b1a22');

export function JourneyRig() {
  const { camera, scene, size, get, gl } = useThree();
  // Sólo desarrollo: acceso al estado de R3F para medir cuadros desde la consola.
  if (import.meta.env.DEV) (window as unknown as { __r3f?: unknown }).__r3f = get;
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const bg = useMemo(() => new THREE.Color(), []);
  const fog = useMemo(() => new THREE.FogExp2('#163341', 0.0001), []);
  const offset = useRef<{ x: Damp; y: Damp }>({ x: { v: 0, vel: 0 }, y: { v: 0, vel: 0 } });
  const lastOffset = useRef('');
  const fov = useRef(45);
  const reduced = useMemo(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  // Mirada libre: arrastrar orbita, pellizcar acerca, doble clic vuelve al plano de la película.
  useEffect(() => {
    const el = gl.domElement;
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const spread = () => {
      const [a, b] = [...pts.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (e: PointerEvent) => {
      if (!canDrag(e.pointerType)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      if (pts.size === 1) beginDrag();
      if (pts.size === 2) pinch = spread();
    };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pts.size >= 2) {
        const s = spread();
        if (pinch > 0 && s > 0) zoomBy(pinch / s);
        pinch = s;
      } else dragBy(dx, dy);
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size === 0) endDrag();
    };
    const dbl = () => resetLook();
    const sync = () => {
      el.style.touchAction = lookStore.getTouch() ? 'none' : 'pan-y';
    };
    sync();
    const off = lookStore.subscribe(sync);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('dblclick', dbl);
    return () => {
      off();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('dblclick', dbl);
      resetLook();
    };
  }, [gl]);

  useFrame((_, dt) => {
    const st = storyStore.get();
    const t = st.t;
    const idx = st.index;
    tickLook(Math.min(dt, 0.1), st.playing || st.flying);
    const cam = cameraAt(t);
    const cp = camera as THREE.PerspectiveCamera;

    // Mirada libre del usuario (desvíos sobre la toma de dirección); se disuelve sola al soltar.
    const L = live.look;
    cameraPosition(cam, L.dAz, L.dEl, L.zoom, cp.position);

    const env = envAt(t, cp.position.y, cam.dist * L.zoom);
    live.t = t;
    live.env = env;
    live.cam = cam;
    live.camPos.copy(cp.position);

    // Orientación: mirar al foco, con alabeo de mano y temblor por presión.
    cp.up.set(0, 1, 0);
    cp.lookAt(cam.focus);
    const shake = reduced ? 0 : env.shake;
    if (shake > 0.001) {
      cp.rotateX(wobble(t * 9.1, 3) * shake * D2R);
      cp.rotateY(wobble(t * 8.3, 5) * shake * D2R);
    }
    cp.rotateZ(cam.roll * D2R);

    // Campo de visión (se cierra con la presión) y planos de recorte según la distancia.
    const targetFov = cam.fov - env.stress * 4;
    fov.current += (targetFov - fov.current) * (1 - Math.exp(-dt * 12));
    cp.fov = fov.current;
    const clip = clipFor(cam.dist * L.zoom);
    cp.near = clip.near;
    cp.far = clip.far;

    // Encuadre: con tarjeta de texto, el centro óptico se corre hacia el área libre.
    const b = beats[idx];
    const wide = size.width > 860;
    const withCard = b.layout === 'card';
    const ox = withCard && wide ? Math.min(200, size.width * 0.13) : 0;
    const oy = withCard && !wide ? size.height * 0.17 : 0;
    smoothDamp(offset.current.x, ox, 0.5, Math.min(dt, 0.1));
    smoothDamp(offset.current.y, oy, 0.5, Math.min(dt, 0.1));
    const key = `${size.width}x${size.height}:${offset.current.x.v.toFixed(1)}:${offset.current.y.v.toFixed(1)}`;
    if (key !== lastOffset.current) {
      lastOffset.current = key;
      cp.setViewOffset(size.width, size.height, -offset.current.x.v, offset.current.y.v, size.width, size.height);
    }
    cp.updateProjectionMatrix();

    // Relieve: se desexagera hasta 1:1 al acercarse al sitio del hallazgo.
    const k = trueScaleAt(cam.dist * L.zoom);
    terrainUniforms.uTrue.value = k;
    terrainUniforms.uHoleOn.value = k > 0.45 ? 1 : 0;

    // Atmósfera.
    scene.fog = fog;
    bg.copy(env.bg);
    scene.background = bg;
    fog.color.copy(env.bg);
    fog.density = env.fog;
    if (hemi.current) hemi.current.intensity = env.hemi;
    if (sun.current) sun.current.intensity = env.sun;
    if (lamp.current) {
      const s = subAt(t);
      lamp.current.position.set(s.pos.x, s.pos.y + 0.012, s.pos.z);
      lamp.current.intensity = env.lamp * (1 - env.blackout * 0.6);
      lamp.current.distance = Math.max(0.4, cam.dist * 5);
    }

    // Mar y cielo.
    oceanLook.storm = env.storm;
    oceanLook.amp = 1;
    oceanLook.night = env.night;
    oceanLook.deep.set('#1f4a5d').lerp(tmp3.set('#0d2433'), env.night).lerp(tmp3.set('#183a47'), env.storm * 0.7);
    oceanLook.sky.set('#7f9eac').lerp(tmp3.set('#16324a'), env.night).lerp(tmp3.set('#4e6a76'), env.storm * 0.7);
    oceanLook.under.copy(env.bg).multiplyScalar(2.1 - 1.0 * seg(env.camDepthM, 0, 300));
    oceanLook.underAlpha = 0.72 - 0.5 * seg(env.camDepthM, 20, 400);
    skyLook.stars = env.night * (1 - env.storm);
    skyLook.top.set('#6c8fa1').lerp(tmp3.set('#050b17'), env.night);
    skyLook.horizon.set('#9ab4c0').lerp(tmp3.set('#12283a'), env.night).lerp(tmp3.set('#41555f'), env.storm * 0.6);

    // La avería de las 06:00 enciende un pulso rojizo muy tenue en el casco.
    heroLook.alert = t >= T.c0600 && t < T.c0719 + 0.2 ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={[BG_DAY, GROUND, 1.2]} />
      <directionalLight ref={sun} position={[-1500, 2600, -900]} intensity={1.2} />
      <pointLight ref={lamp} intensity={0} distance={1} decay={0} color="#cfe6ee" />
    </>
  );
}

const tmp3 = new THREE.Color();
