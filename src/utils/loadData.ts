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

export interface ProvinceFeature {
  type: 'Feature';
  properties: { nombre: string; codigo: string };
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] };
}

export interface ExploreData {
  provincias: ProvinceFeature[];
  /** Relieve GEBCO de Argentina (0,12°). null si todavía no se generó el archivo. */
  argentina: Grid | null;
}

/** Datos del modo exploración: se cargan recién cuando se entra a explorar. */
export function useExploreData(enabled: boolean) {
  const [data, setData] = useState<ExploreData | null>(null);
  useEffect(() => {
    if (!enabled || data) return;
    let alive = true;
    Promise.all([
      getJson<{ features: ProvinceFeature[] }>('provincias-ar.json'),
      getJson<Grid>('bathy_argentina.json').catch(() => null),
    ])
      .then(([prov, argentina]) => alive && setData({ provincias: prov.features, argentina }))
      .catch(() => alive && setData({ provincias: [], argentina: null }));
    return () => {
      alive = false;
    };
  }, [enabled, data]);
  return data;
}
