import * as THREE from 'three';
import type { SubState } from './subPath';

/** Matriz modelo→mundo del submarino (modelo en metros, proa en +x; mundo en km). */
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

export function subMatrix(s: SubState, scale: number, out = new THREE.Matrix4()) {
  _e.set(s.roll, s.yaw, s.pitch, 'YZX');
  _q.setFromEuler(_e);
  _s.setScalar(scale);
  return out.compose(s.pos, _q, _s);
}
