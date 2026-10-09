import * as THREE from 'three';
import { mapPoint } from '../three/geoFrame';
import { POS_0028, POS_CTBTO, POS_HALLAZGO, COAST_NEAREST_0028, positionById } from '../data/positions';

/**
 * Lugares de referencia en el marco del mapa (1 u = 1 km; x = este, z = sur, y = altura sobre
 * el nivel del mar). Son los únicos sitios con posición documentada o estimada.
 * Los vectores se comparten: clonar antes de modificar.
 */
const at = (lat: number, lon: number, y = 0) => new THREE.Vector3(...mapPoint(lat, lon)).setY(y);

const mdp = positionById.get('mar-del-plata')!;
const ush = positionById.get('ushuaia')!;

export const ANCHOR = {
  mdp: at(mdp.lat, mdp.lon),
  ush: at(ush.lat, ush.lon),
  p0028: at(POS_0028.lat, POS_0028.lon),
  ctbto: at(POS_CTBTO.lat, POS_CTBTO.lon),
  wreck: at(POS_HALLAZGO.lat, POS_HALLAZGO.lon),
  coast: at(COAST_NEAREST_0028.lat, COAST_NEAREST_0028.lon),
  argentina: at(-45, -63),
};

/**
 * El submarino empieza 6 km mar adentro del puerto, en agua abierta (la coordenada de Mar del
 * Plata es la de la ciudad, sobre la costa). Es una licencia de encuadre: a escala de mapa
 * no se distingue del puerto.
 */
export const SUB_START = ANCHOR.mdp.clone().add(new THREE.Vector3(6, 0, 0.5));

/** Rumbo (grados desde el norte, sentido horario) → giro sobre Y para un modelo con la proa en +x. */
export const bearingToYaw = (deg: number) => Math.PI / 2 - (deg * Math.PI) / 180;
