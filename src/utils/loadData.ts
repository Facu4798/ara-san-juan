import { useEffect, useState } from 'react';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import type { Grid } from '../data/types';

export interface GeoData {
  land: Feature<Geometry> | FeatureCollection<Geometry>;
  shelf: Grid;
  regional: Grid;
  wreckLocal: Grid;
}

const url = (p: string) => `${import.meta.env.BASE_URL}data/${p}`;

async function getJson<T>(p: string): Promise<T> {
  const r = await fetch(url(p));
  if (!r.ok) throw new Error(`No se pudo cargar ${p}: ${r.status}`);
  return r.json() as Promise<T>;
}

/** Carga perezosa de los datasets pesados (costa y batimetría). */
export function useGeoData() {
  const [data, setData] = useState<GeoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getJson<Topology<{ land: GeometryCollection }>>('land-50m.json'),
      getJson<Grid>('bathy_shelf.json'),
      getJson<Grid>('bathy_regional.json'),
      getJson<Grid>('bathy_wreck_local.json'),
    ])
      .then(([topo, shelf, regional, wreckLocal]) => {
        if (!alive) return;
        setData({ land: feature(topo, topo.objects.land), shelf, regional, wreckLocal });
      })
      .catch((e: unknown) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  return { data, error };
}

/** Valor de la grilla por interpolación bilineal (lat/lon ascendentes). */
export function sampleGrid(g: Grid, lat: number, lon: number): number {
  const dLat = g.lats[1] - g.lats[0];
  const dLon = g.lons[1] - g.lons[0];
  const fy = Math.min(Math.max((lat - g.lats[0]) / dLat, 0), g.rows - 1.0001);
  const fx = Math.min(Math.max((lon - g.lons[0]) / dLon, 0), g.cols - 1.0001);
  const y0 = Math.floor(fy), x0 = Math.floor(fx);
  const ty = fy - y0, tx = fx - x0;
  const v = (y: number, x: number) => g.elevation[y * g.cols + x];
  return (
    v(y0, x0) * (1 - tx) * (1 - ty) + v(y0, x0 + 1) * tx * (1 - ty) + v(y0 + 1, x0) * (1 - tx) * ty + v(y0 + 1, x0 + 1) * tx * ty
  );
}
