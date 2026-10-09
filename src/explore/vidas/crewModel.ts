import memorial from '../../data/generated/tripulantes_memorial.json';
import { crew, OFFICER_RANKS, RANK_ORDER } from '../../data/crew';
import { portraitUrl } from '../../data/portraits';
import type { CrewFilters } from '../../app/appStore';

/**
 * PERFILES DE LOS 44: une las fuentes sin mezclarlas.
 *   nómina y grado ............ Decreto 212/2020 (oficial)
 *   nacimiento, edad, biografía Memorial «44 Presentes» (MinDef y Armada, oficial)
 *   coordenadas del nacimiento  API Georef, datos.gob.ar (nomenclador oficial)
 *   sexo ...................... Armada («43 hombres y una mujer») + única mujer identificada
 *   función y origen en 2017 ... Infobae 30/11/2017 (prensa, secundario)
 * La edad se calcula a partir de la fecha de nacimiento oficial al 15/11/2017.
 */
export type Precision = 'localidad' | 'aproximada' | 'departamento' | 'ambigua';

interface MemorialRow {
  orden: number;
  nombreMemorial: string;
  gradoMemorial: string;
  sexo: 'mujer' | 'varón';
  nacimiento: {
    texto: string;
    fecha: string;
    localidad: string;
    provincia: string;
    lat: number;
    lon: number;
    georefId: string;
    precision: Precision;
    nota: string | null;
  };
  edad: number;
  bio: string[];
}

export interface CrewProfile {
  orden: number;
  nombre: string;
  grado: string;
  grupo: 'Oficiales' | 'Suboficiales';
  gradoPrensa2017?: string;
  gradoPostMortem: string;
  sexo: 'mujer' | 'varón';
  edad: number;
  nacimiento: MemorialRow['nacimiento'];
  /** Datos de prensa (2017): pueden referirse a residencia y no a nacimiento. */
  prensa: { edad?: number; localidad?: string; provincia?: string; funcion?: string };
  bio: string[];
  retrato: string | null;
  fuentes: string[];
}

const byOrden = new Map((memorial as MemorialRow[]).map((m) => [m.orden, m]));

export const PROFILES: CrewProfile[] = crew.map((c) => {
  const m = byOrden.get(c.orden)!;
  return {
    orden: c.orden,
    nombre: c.nombreCompleto,
    grado: c.gradoDecreto,
    grupo: OFFICER_RANKS.has(c.gradoDecreto as (typeof RANK_ORDER)[number]) ? 'Oficiales' : 'Suboficiales',
    gradoPrensa2017: c.gradoPrensa2017,
    gradoPostMortem: m.gradoMemorial,
    sexo: m.sexo,
    edad: m.edad,
    nacimiento: m.nacimiento,
    prensa: { edad: c.edad, localidad: c.localidad, provincia: c.provincia, funcion: c.funcion },
    bio: m.bio,
    retrato: portraitUrl(c.orden),
    fuentes: ['decreto212', 'memorial44', 'georef', ...(c.fuentesPerfil.includes('infobae2017tripulantes') ? ['infobae2017tripulantes'] : [])],
  };
});

export const profileByOrden = new Map(PROFILES.map((p) => [p.orden, p]));

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Filtros combinados (todos deben cumplirse). */
export function matches(p: CrewProfile, f: CrewFilters): boolean {
  if (f.provincias.length && !f.provincias.includes(p.nacimiento.provincia)) return false;
  if (p.edad < f.edad[0] || p.edad > f.edad[1]) return false;
  if (f.sexo !== 'todos' && p.sexo !== f.sexo) return false;
  if (f.grados.length && !f.grados.includes(p.grado)) return false;
  if (f.localidad && !norm(`${p.nacimiento.localidad} ${p.nacimiento.texto}`).includes(norm(f.localidad))) return false;
  if (f.nombre && !norm(p.nombre).includes(norm(f.nombre))) return false;
  return true;
}

export function filterProfiles(f: CrewFilters) {
  return PROFILES.filter((p) => matches(p, f));
}

/** Provincias de nacimiento presentes, con cantidad (orden descendente). */
export const PROVINCIAS: { nombre: string; n: number }[] = [...PROFILES.reduce((m, p) => m.set(p.nacimiento.provincia, (m.get(p.nacimiento.provincia) ?? 0) + 1), new Map<string, number>())]
  .map(([nombre, n]) => ({ nombre, n }))
  .sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre));

/** Grados presentes, en orden del escalafón. */
export const GRADOS = RANK_ORDER.filter((g) => PROFILES.some((p) => p.grado === g)).map((g) => ({
  nombre: g,
  n: PROFILES.filter((p) => p.grado === g).length,
}));

export const LOCALIDADES = [...new Set(PROFILES.map((p) => p.nacimiento.localidad))].sort((a, b) => a.localeCompare(b));

/** Agrupa personas por lugar de nacimiento georreferenciado (mismo identificador oficial). */
export interface PlaceGroup {
  key: string;
  lat: number;
  lon: number;
  localidad: string;
  provincia: string;
  precision: Precision;
  people: CrewProfile[];
}

export const PLACES: PlaceGroup[] = [...PROFILES.reduce((m, p) => {
  const k = p.nacimiento.georefId;
  const g = m.get(k) ?? { key: k, lat: p.nacimiento.lat, lon: p.nacimiento.lon, localidad: p.nacimiento.localidad, provincia: p.nacimiento.provincia, precision: p.nacimiento.precision, people: [] };
  g.people.push(p);
  return m.set(k, g);
}, new Map<string, PlaceGroup>()).values()];

export const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

/** Diferencias entre la edad oficial calculada y la publicada por la prensa en 2017. */
export const AGE_DIFFS = PROFILES.filter((p) => p.prensa.edad != null && p.prensa.edad !== p.edad).map((p) => ({
  orden: p.orden,
  nombre: p.nombre,
  oficial: p.edad,
  prensa: p.prensa.edad!,
}));
