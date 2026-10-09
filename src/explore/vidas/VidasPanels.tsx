import { useMemo } from 'react';
import { DEFAULT_FILTERS, EDAD_RANGO, resetFilters, setApp, setFilters, useApp, type CrewFilters } from '../../app/appStore';
import { SourceRefs } from '../../components/Certainty';
import { distanceKm } from '../../utils/geo';
import { positionById } from '../../data/positions';
import { fmt0 } from '../../utils/format';
import { AGE_DIFFS, GRADOS, LOCALIDADES, PLACES, PROFILES, PROVINCIAS, filterProfiles, median, profileByOrden, type CrewProfile } from './crewModel';

/**
 * MÓDULO 1 · Paneles de «Las 44 vidas»: filtros combinados, gráficos sincronizados,
 * resultados, ficha de cada persona y hallazgos calculados con los datos.
 */

const MDP = positionById.get('mar-del-plata')!;
const distBase = (p: CrewProfile) => distanceKm(p.nacimiento, MDP);
const shortProv = (p: string) => (p === 'Ciudad Autónoma de Buenos Aires' ? 'CABA' : p);

// ——— Filtros ———

function ActiveChips({ f }: { f: CrewFilters }) {
  const chips: { k: string; label: string; clear: () => void }[] = [];
  f.provincias.forEach((p) => chips.push({ k: `p-${p}`, label: shortProv(p), clear: () => setFilters({ provincias: f.provincias.filter((x) => x !== p) }) }));
  if (f.edad[0] !== EDAD_RANGO[0] || f.edad[1] !== EDAD_RANGO[1]) chips.push({ k: 'edad', label: `${f.edad[0]}–${f.edad[1]} años`, clear: () => setFilters({ edad: [...EDAD_RANGO] }) });
  if (f.sexo !== 'todos') chips.push({ k: 'sexo', label: f.sexo === 'mujer' ? 'Mujeres' : 'Varones', clear: () => setFilters({ sexo: 'todos' }) });
  f.grados.forEach((g) => chips.push({ k: `g-${g}`, label: g, clear: () => setFilters({ grados: f.grados.filter((x) => x !== g) }) }));
  if (f.localidad) chips.push({ k: 'loc', label: `Localidad: ${f.localidad}`, clear: () => setFilters({ localidad: '' }) });
  if (f.nombre) chips.push({ k: 'nom', label: `Nombre: ${f.nombre}`, clear: () => setFilters({ nombre: '' }) });
  if (!chips.length) return null;
  return (
    <div className="active-chips">
      {chips.map((c) => (
        <button key={c.k} type="button" className="chip-x" onClick={c.clear} title="Quitar este filtro">
          {c.label} <span aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" className="link" onClick={resetFilters}>Restablecer filtros</button>
    </div>
  );
}

function AgeRange({ value }: { value: [number, number] }) {
  const [lo, hi] = value;
  const pct = (v: number) => ((v - EDAD_RANGO[0]) / (EDAD_RANGO[1] - EDAD_RANGO[0])) * 100;
  return (
    <div className="dual-range">
      <div className="track"><div className="fill" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} /></div>
      <input type="range" min={EDAD_RANGO[0]} max={EDAD_RANGO[1]} value={lo} aria-label="Edad mínima"
        onChange={(e) => setFilters({ edad: [Math.min(Number(e.target.value), hi), hi] })} />
      <input type="range" min={EDAD_RANGO[0]} max={EDAD_RANGO[1]} value={hi} aria-label="Edad máxima"
        onChange={(e) => setFilters({ edad: [lo, Math.max(Number(e.target.value), lo)] })} />
      <div className="range-values"><span>{lo} años</span><span>{hi} años</span></div>
    </div>
  );
}

function AgeHistogram({ results }: { results: CrewProfile[] }) {
  const ages = Array.from({ length: EDAD_RANGO[1] - EDAD_RANGO[0] + 1 }, (_, i) => EDAD_RANGO[0] + i);
  const all = new Map<number, number>();
  PROFILES.forEach((p) => all.set(p.edad, (all.get(p.edad) ?? 0) + 1));
  const sel = new Map<number, number>();
  results.forEach((p) => sel.set(p.edad, (sel.get(p.edad) ?? 0) + 1));
  const max = Math.max(...all.values());
  const W = 280, H = 70, bw = W / ages.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="chart" role="img" aria-label="Distribución de edades al 15/11/2017; en claro, las personas que cumplen los filtros">
      {ages.map((a, i) => {
        const t = all.get(a) ?? 0, s = sel.get(a) ?? 0;
        return (
          <g key={a} transform={`translate(${i * bw},0)`}>
            <title>{`${a} años: ${t} (${s} con los filtros)`}</title>
            <rect x={1} y={H - (t / max) * H} width={bw - 2} height={(t / max) * H} className="bar-all" />
            <rect x={1} y={H - (s / max) * H} width={bw - 2} height={(s / max) * H} className="bar-sel" />
          </g>
        );
      })}
      {[25, 30, 35, 40, 45].map((a) => (
        <text key={a} x={(a - EDAD_RANGO[0]) * bw + bw / 2} y={H + 13} textAnchor="middle" className="axis">{a}</text>
      ))}
    </svg>
  );
}

function ProvinceBars({ results, selected }: { results: CrewProfile[]; selected: string[] }) {
  const sel = new Map<string, number>();
  results.forEach((p) => sel.set(p.nacimiento.provincia, (sel.get(p.nacimiento.provincia) ?? 0) + 1));
  const max = PROVINCIAS[0].n;
  return (
    <div className="hbars" role="list" aria-label="Nacimientos por provincia (clic para filtrar)">
      {PROVINCIAS.map((p) => {
        const on = selected.includes(p.nombre);
        return (
          <button
            key={p.nombre}
            type="button"
            role="listitem"
            className={`hbar${on ? ' on' : ''}`}
            aria-pressed={on}
            onClick={() => {
              setFilters({ provincias: on ? selected.filter((x) => x !== p.nombre) : [...selected, p.nombre] });
              setApp({ focusProvince: on ? null : p.nombre, selectedPlace: null });
            }}
          >
            <span className="name">{shortProv(p.nombre)}</span>
            <span className="track">
              <span className="all" style={{ width: `${(p.n / max) * 100}%` }} />
              <span className="sel" style={{ width: `${((sel.get(p.nombre) ?? 0) / max) * 100}%` }} />
            </span>
            <span className="n">{sel.get(p.nombre) ?? 0}/{p.n}</span>
          </button>
        );
      })}
    </div>
  );
}

export function VidasFilters() {
  const f = useApp((s) => s.filters);
  const results = useMemo(() => filterProfiles(f), [f]);
  return (
    <div className="panel-body">
      <h2 className="panel-title">Las 44 vidas</h2>
      <p className="panel-lede">¿De dónde eran, qué edad tenían, qué grado? Filtrá y el mapa, la lista y los gráficos cambian juntos.</p>
      <p className="counter" aria-live="polite">Mostrando <strong>{results.length}</strong> de 44 tripulantes</p>
      <ActiveChips f={f} />

      <label className="field">
        <span>Nombre</span>
        <input type="search" placeholder="Buscar por nombre…" value={f.nombre} onChange={(e) => setFilters({ nombre: e.target.value })} />
      </label>
      <label className="field">
        <span>Localidad de nacimiento</span>
        <input type="search" list="localidades" placeholder="Ej.: Palpalá" value={f.localidad} onChange={(e) => setFilters({ localidad: e.target.value })} />
        <datalist id="localidades">{LOCALIDADES.map((l) => <option key={l} value={l} />)}</datalist>
      </label>

      <fieldset className="field">
        <legend>Edad al 15/11/2017</legend>
        <AgeRange value={f.edad} />
        <AgeHistogram results={results} />
      </fieldset>

      <fieldset className="field">
        <legend>Provincia de nacimiento <span className="muted small">(clic en una barra o en el mapa)</span></legend>
        <ProvinceBars results={results} selected={f.provincias} />
      </fieldset>

      <fieldset className="field">
        <legend>Sexo</legend>
        <div className="segmented">
          {(['todos', 'varón', 'mujer'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={f.sexo === s} onClick={() => setFilters({ sexo: s })}>
              {s === 'todos' ? 'Todos' : s === 'varón' ? 'Varones' : 'Mujeres'}
            </button>
          ))}
        </div>
        <p className="muted small">
          Dato oficial: «43 hombres y una mujer» (Armada). La única mujer está identificada por el memorial y la prensa. No se infiere de nombres ni de fotos.
          <SourceRefs ids={['armadaMicrositio2018', 'memorial44', 'infobae2017tripulantes']} />
        </p>
      </fieldset>

      <fieldset className="field">
        <legend>Grado (Decreto 212/2020)</legend>
        <div className="chips-wrap">
          {GRADOS.map((g) => {
            const on = f.grados.includes(g.nombre);
            return (
              <button key={g.nombre} type="button" className="chip" aria-pressed={on}
                onClick={() => setFilters({ grados: on ? f.grados.filter((x) => x !== g.nombre) : [...f.grados, g.nombre] })}>
                {g.nombre} <span className="muted">{g.n}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      {JSON.stringify(f) !== JSON.stringify(DEFAULT_FILTERS) && (
        <button type="button" className="btn-ghost small block" onClick={resetFilters}>Restablecer filtros</button>
      )}
    </div>
  );
}

// ——— Resultados y ficha ———

function PersonDetail({ p }: { p: CrewProfile }) {
  const n = p.nacimiento;
  return (
    <article className="person-detail">
      <button type="button" className="link back" onClick={() => setApp({ selectedCrew: null })}>← volver a la lista</button>
      <div className="pd-head">
        {p.retrato && <img src={p.retrato} alt={`Retrato de ${p.nombre}`} />}
        <div>
          <h3>{p.nombre}</h3>
          <p className="muted">{p.grado} <span className="small">(Decreto 212/2020)</span></p>
          <p className="small">{p.gradoPostMortem}</p>
        </div>
      </div>
      <dl>
        <dt>Edad</dt>
        <dd>{p.edad} años al 15/11/2017 <span className="muted small">(nació el {new Date(n.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })})</span></dd>
        <dt>Nacimiento</dt>
        <dd>
          {n.texto}
          {n.precision !== 'localidad' && <div className="warn small">Ubicación {n.precision} en el mapa. {n.nota}</div>}
        </dd>
        <dt>Distancia a la base</dt>
        <dd>{fmt0(distBase(p))} km de Mar del Plata <span className="muted small">(cálculo propio)</span></dd>
        {(p.prensa.funcion || p.prensa.localidad) && (
          <>
            <dt>Prensa, 2017</dt>
            <dd className="small">
              {p.prensa.funcion && <>Función: {p.prensa.funcion}. </>}
              {p.prensa.localidad && <>Origen: {[p.prensa.localidad, p.prensa.provincia].filter(Boolean).join(', ')}. </>}
              {p.prensa.edad != null && p.prensa.edad !== p.edad && <>Edad publicada: {p.prensa.edad}. </>}
              <SourceRefs ids={['infobae2017tripulantes']} />
            </dd>
          </>
        )}
      </dl>
      <h4>Biografía oficial</h4>
      {p.bio.map((b, i) => <p key={i} className="bio">{b}</p>)}
      <p className="muted small">Fuentes: <SourceRefs ids={p.fuentes} /></p>
    </article>
  );
}

function Findings() {
  const byProv = PROVINCIAS;
  const jujuySalta = (byProv.find((p) => p.nombre === 'Jujuy')?.n ?? 0) + (byProv.find((p) => p.nombre === 'Salta')?.n ?? 0);
  const ba = byProv.find((p) => p.nombre === 'Buenos Aires')?.n ?? 0;
  const dists = PROFILES.map(distBase);
  const far = dists.filter((d) => d > 1000).length;
  const off = PROFILES.filter((p) => p.grupo === 'Oficiales').map((p) => p.edad);
  const sub = PROFILES.filter((p) => p.grupo === 'Suboficiales').map((p) => p.edad);
  return (
    <section className="findings">
      <h4>Lo que muestran los datos</h4>
      <ul>
        <li>Jujuy y Salta suman <strong>{jujuySalta}</strong> nacimientos: más que la provincia de Buenos Aires (<strong>{ba}</strong>), donde estaba la base.</li>
        <li>La mitad nació a más de <strong>{fmt0(median(dists))} km</strong> de Mar del Plata; {far} de 44, a más de 1.000 km.</li>
        <li>Edad mediana: <strong>{fmt0(median(PROFILES.map((p) => p.edad)))}</strong> años (oficiales {median(off)}; suboficiales {median(sub)}).</li>
        <li>En {AGE_DIFFS.length} de los 26 casos con edad publicada por la prensa en 2017, esa edad difiere de la calculada con la fecha oficial de nacimiento.</li>
      </ul>
      <p className="muted small">Cálculos propios sobre el memorial oficial y el nomenclador Georef. Las ubicaciones no exactas ({PLACES.filter((p) => p.precision !== 'localidad').reduce((a, p) => a + p.people.length, 0)} personas) se incluyen. <SourceRefs ids={['memorial44', 'georef']} /></p>
    </section>
  );
}

/**
 * Mosaico de los 44: están siempre todos —la nómina completa es el dato— y los que no cumplen
 * los filtros se atenúan en lugar de desaparecer, para no perder la escala del conjunto.
 * Sin retrato verificado se muestra la inicial y se avisa en la ficha.
 */
function Mosaic({ highlight, selected }: { highlight: Set<number>; selected: number | null }) {
  return (
    <ul className="mosaic" aria-label="Los 44 tripulantes; los atenuados no cumplen los filtros">
      {PROFILES.map((p) => {
        const on = highlight.has(p.orden);
        return (
          <li key={p.orden}>
            <button
              type="button"
              className={`face${on ? '' : ' dim'}${selected === p.orden ? ' on' : ''}`}
              aria-pressed={selected === p.orden}
              title={`${p.nombre} · ${p.grado} · ${p.edad} años · ${p.nacimiento.localidad}, ${shortProv(p.nacimiento.provincia)}${on ? '' : ' (no cumple los filtros)'}`}
              onClick={() => setApp({ selectedCrew: p.orden, selectedPlace: p.nacimiento.georefId })}
            >
              {p.retrato ? <img src={p.retrato} alt={`Retrato de ${p.nombre}`} loading="lazy" /> : <span className="noface" aria-hidden="true">{p.nombre[0]}</span>}
              <span className="name">{p.nombre.split(' ').slice(-1)[0]}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function VidasResults() {
  const f = useApp((s) => s.filters);
  const view = useApp((s) => s.vidasView);
  const selectedCrew = useApp((s) => s.selectedCrew);
  const selectedPlace = useApp((s) => s.selectedPlace);
  const results = useMemo(() => filterProfiles(f), [f]);
  const place = PLACES.find((p) => p.key === selectedPlace);
  const list = place ? results.filter((p) => p.nacimiento.georefId === place.key) : results;
  const person = selectedCrew != null ? profileByOrden.get(selectedCrew) : null;
  const highlight = useMemo(() => new Set(list.map((p) => p.orden)), [list]);

  if (person) return <div className="panel-body"><PersonDetail p={person} /></div>;
  return (
    <div className="panel-body">
      <div className="segmented view-switch">
        {(['mosaico', 'lista'] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setApp({ vidasView: v })}>
            {v === 'mosaico' ? 'Los 44 rostros' : 'Lista con datos'}
          </button>
        ))}
      </div>
      {place ? (
        <div className="place-head">
          <h3>Nacidos en {place.localidad}</h3>
          <p className="muted small">{place.provincia} · {place.people.length} en total{list.length !== place.people.length && `, ${list.length} con los filtros`}</p>
          <button type="button" className="link" onClick={() => setApp({ selectedPlace: null })}>ver todos los resultados</button>
        </div>
      ) : (
        <h3 className="results-title">Resultados <span className="muted">({results.length})</span></h3>
      )}
      {list.length === 0 && <p className="muted">Ningún tripulante cumple todos los filtros.</p>}
      {view === 'mosaico' ? (
        <Mosaic highlight={highlight} selected={selectedCrew} />
      ) : (
        <ul className="results">
          {list.map((p) => (
            <li key={p.orden}>
              <button type="button" onClick={() => setApp({ selectedCrew: p.orden, selectedPlace: p.nacimiento.georefId })}>
                {p.retrato && <img src={p.retrato} alt="" loading="lazy" />}
                <span>
                  <strong>{p.nombre}</strong>
                  <small>{p.grado} · {p.edad} años · {p.nacimiento.localidad}, {shortProv(p.nacimiento.provincia)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!place && <Findings />}
    </div>
  );
}
