import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { storyStore, flyTo, isStoryLocked } from '../story/store';
import { setApp } from '../app/appStore';
import { ANCHOR } from '../journey/anchors';
import { HITOS, T } from '../journey/timeline';
import { cameraAt } from '../journey/camera';
import { subAt } from '../journey/subPath';
import { SUB_PARTS } from '../explore/travesia/subParts';
import { start } from '../audio/engine';

/**
 * PUNTOS INTERACTIVOS DE LA ESCENA. Aparecen cuando la película está en pausa (o terminó): cada lugar
 * documentado es un botón que lleva la cámara hasta ahí con un vuelo suave y abre la evidencia (fuentes,
 * fragmento citado, certeza). Sobre el submarino, a escala cercana, se pueden abrir sus cuatro partes
 * informadas. Sólo se ubican lugares con posición publicada o estimada.
 */
const SPOTS: { id: string; at: THREE.Vector3; label: string; hito: string; tone: 'hecho' | 'estimacion' }[] = [
  { id: 'mdp', at: ANCHOR.mdp, label: 'Mar del Plata · zarpe', hito: 'zarpe', tone: 'hecho' },
  { id: 'ush', at: ANCHOR.ush, label: 'Ushuaia · escala', hito: 'ushuaia', tone: 'hecho' },
  { id: 'p0028', at: ANCHOR.p0028, label: '00:28 · última coordenada', hito: 'c0028', tone: 'hecho' },
  { id: 'ctbto', at: ANCHOR.ctbto, label: '10:51 · evento acústico (estimación)', hito: 'ctbto', tone: 'estimacion' },
  { id: 'wreck', at: ANCHOR.wreck, label: 'Hallazgo · 907 m', hito: 'hallazgo', tone: 'hecho' },
];

export function Hotspots() {
  const [show, setShow] = useState(false);
  const last = useRef(false);

  useFrame(() => {
    const st = storyStore.get();
    const dist = cameraAt(st.t).dist;
    // Sólo con la película detenida y la cámara en vista de mapa (los puntos de lugar).
    const idle = !st.playing && !st.flying && !isStoryLocked();
    const on = idle && dist > 25 && st.t < T.descenso - 1;
    const on2 = idle && st.t >= T.distancia + 3.4 && st.t < T.cierre;
    const v = on || on2;
    if (v !== last.current) {
      last.current = v;
      setShow(v);
    }
  });

  if (!show) return null;
  return (
    <group>
      {SPOTS.map((s) => {
        const h = HITOS.find((x) => x.id === s.hito)!;
        return (
          <Html key={s.id} position={[s.at.x, 3, s.at.z]} center zIndexRange={[6, 0]}>
            <button
              type="button"
              className={`spot ${s.tone}`}
              onClick={() => {
                void start();
                flyTo(h.t);
                setApp({ evidenceEventId: h.eventId });
              }}
              title={`${s.label}: ver evidencia`}
            >
              <i aria-hidden="true" />
              <span>{s.label}</span>
            </button>
          </Html>
        );
      })}
    </group>
  );
}

/** Las cuatro partes informadas del submarino, como puntos sobre el modelo (a escala cercana y en pausa). */
export function SubPartSpots() {
  const [show, setShow] = useState(false);
  const last = useRef(false);

  useFrame(({ camera }) => {
    const st = storyStore.get();
    const s = subAt(st.t);
    const d = camera.position.distanceTo(s.pos);
    const v = !st.playing && !st.flying && !isStoryLocked() && d < 0.15 && (s.mode === 'solido' || s.mode === 'reconstruccion') && s.opacity > 0.6;
    if (v !== last.current) {
      last.current = v;
      setShow(v);
    }
  });

  if (!show) return null;
  return (
    <>
      {SUB_PARTS.map((p) => (
        <Html key={p.id} position={p.at} center zIndexRange={[6, 0]}>
          <button type="button" className="hotspot" onClick={() => setApp({ selectedPart: p.id })}>
            <span className="dot" aria-hidden="true" />
            {p.nombre}
          </button>
        </Html>
      ))}
    </>
  );
}
