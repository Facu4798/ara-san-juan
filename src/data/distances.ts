import { POS_0028, POS_CTBTO, POS_HALLAZGO, positionById } from './positions';
import { distanceKm } from '../utils/geo';

/** Distancias ortodrómicas entre puntos publicados. Cálculo propio (haversine). */
export const DIST = {
  mdp: distanceKm(POS_0028, positionById.get('mar-del-plata')!),
  ctbto: distanceKm(POS_0028, POS_CTBTO),
  wreck: distanceKm(POS_0028, POS_HALLAZGO),
  wreckCtbto: distanceKm(POS_HALLAZGO, POS_CTBTO),
  seco128: distanceKm(positionById.get('seco-128')!, POS_HALLAZGO),
};
