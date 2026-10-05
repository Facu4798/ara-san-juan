import { useCallback, useMemo, useState } from 'react';
import { events, PHASE_LABEL } from '../data/events';
import { crew } from '../data/crew';
import { positionById } from '../data/positions';
import type { Certainty, Phase, Position } from '../data/types';
import type { GeoData } from '../utils/loadData';
import { useSize } from '../utils/useScrollSection';
import { StoryMap } from '../visualizations/StoryMap';
import { TimeBrush } from '../visualizations/TimeBrush';
import type { BBox } from '../scenes/storySteps';
import { CertaintyBadge, SourceRefs } from './Certainty';
import { fmtDate, fmtTime } from '../utils/format';

const VIEWS: { id: string; label: string; bbox: BBox }[] = [
  { id: 'atlantico', label: 'Atlántico Sur', bbox: [-73, -56.5, -49, -33.5] },
  { id: 'zona', label: 'Zona', bbox: [-63.5, -47.6, -55.8, -42.2] },
  { id: 'sitio', label: 'Sitio', bbox: [-61.2, -47.0, -58.8, -45.45] },
];

const PHASES = Object.keys(PHASE_LABEL) as Phase[];

export function Explorer({ geo }: { geo: GeoData | null }) {
  const [phases, setPhases] = useState<Set<Phase>>(new Set(PHASES));
  const [certs, setCerts] = useState<Set<Certainty>>(new Set(['hecho', 'estimacion', 'hipotesis']));
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState(VIEWS[2]);
  const map = useSize<HTMLDivElement>();
  const brush = useSize<HTMLDivElement>();

  const toggle = <T,>(set: Set<T>, v: T) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      events
        .filter((e) => phases.has(e.phase) && certs.has(e.certainty))
        .filter((e) => !range || (Date.parse(e.datetime) >= range[0] && Date.parse(e.datetime) <= range[1]))
        .filter((e) => !q || `${e.titulo} ${e.detalle} ${e.nota ?? ''}`.toLowerCase().includes(q))
        .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime)),
    [phases, certs, range, q],
  );
  const crewHits = useMemo(
    () => (q.length < 2 ? [] : crew.filter((c) => `${c.nombreCompleto} ${c.gradoDecreto} ${c.provincia ?? ''} ${c.localidad ?? ''} ${c.funcion ?? ''}`.toLowerCase().includes(q))),
    [q],
  );

  const onRange = useCallback((r: [number, number] | null) => setRange(r), []);
  const selectPosition = useCallback((p: Position) => {
    const ev = events.find((e) => e.positionId === p.id);
    setSelectedId(ev ? ev.id : null);
  }, []);

  const selectedEvent = events.find((e) => e.id === selectedId);
  const selectedPos = selectedEvent?.positionId ? positionById.get(selectedEvent.positionId) : undefined;
  const secoRange: [number, number] = range ?? [Date.parse('2018-09-01T00:00:00-03:00'), Date.parse('2018-11-30T00:00:00-03:00')];

  return (
    <section id="explorar" className="section" aria-labelledby="explorar-title">
      <div className="eyebrow">08 · Explorar</div>
      <h2 id="explorar-title">Explorar los datos</h2>
      <p className="lede">Filtrá por período, fase, nivel de certeza o texto. Arrastrá sobre la línea de tiempo para acotar el período; el mapa muestra lo que cae dentro.</p>

      <div className="explorer-filters" style={{ marginTop: 20 }}>
        {PHASES.map((p) => (
          <button key={p} className="chip" aria-pressed={phases.has(p)} onClick={() => setPhases(toggle(phases, p))}>{PHASE_LABEL[p]}</button>
        ))}
      </div>
      <div className="explorer-filters" style={{ marginTop: 8 }}>
        {(['hecho', 'estimacion', 'hipotesis'] as const).map((c) => (
          <button key={c} className="chip" aria-pressed={certs.has(c)} onClick={() => setCerts(toggle(certs, c))}>
            <i className={`glyph ${c}`} style={{ width: 8, height: 8, marginRight: 6, verticalAlign: 'middle' }} />
            {c === 'hecho' ? 'hechos' : c === 'estimacion' ? 'estimaciones' : 'hipótesis'}
          </button>
        ))}
        <input type="search" placeholder="Buscar evento o tripulante…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar" />
        {range && <button className="chip" onClick={() => setRange(null)}>limpiar período</button>}
      </div>

      <div className="brush-wrap" ref={brush.ref}>
        <TimeBrush events={filtered} width={brush.width} range={range} onRange={onRange} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      <div className="explorer">
        <div>
          <div className="explorer-filters" style={{ marginBottom: 8 }}>
            {VIEWS.map((v) => (
              <button key={v.id} className="chip" aria-pressed={view.id === v.id} onClick={() => setView(v)}>{v.label}</button>
            ))}
          </div>
          <div className="explorer-map" ref={map.ref}>
            {geo && map.width > 0 && (
              <StoryMap
                geo={geo}
                bbox={view.bbox}
                width={map.width}
                height={map.height}
                title="Mapa de exploración con posiciones documentadas y estimadas"
                layers={{
                  refs: true,
                  p0028: 'crisp',
                  ctbto: 'on',
                  wreck: true,
                  distances: false,
                  secoRange,
                  secoHighlight: selectedPos?.kind === 'buque-busqueda' ? selectedPos.id : undefined,
                  selectedId: selectedPos?.id,
                  onSelect: selectPosition,
                }}
              />
            )}
          </div>
          {crewHits.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="eyebrow">Tripulantes ({crewHits.length})</div>
              <ul style={{ paddingLeft: 18, color: 'var(--ink-2)', fontSize: 14 }}>
                {crewHits.map((c) => (
                  <li key={c.orden}>
                    {c.gradoDecreto} {c.nombreCompleto}
                    {c.edad != null && ` · ${c.edad} años`}
                    {c.provincia && ` · ${c.provincia}`}
                    <a className="srcref" href="#los44">[ver en 44]</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{filtered.length} eventos</div>
          <ul className="event-list" role="listbox" aria-label="Eventos filtrados">
            {filtered.map((e) => (
              <li key={e.id} role="option" aria-selected={selectedId === e.id} tabIndex={0}
                onClick={() => setSelectedId(e.id === selectedId ? null : e.id)}
                onKeyDown={(k) => k.key === 'Enter' && setSelectedId(e.id === selectedId ? null : e.id)}>
                <div className="when">
                  <span>{fmtDate(e.datetime)}{e.precision === 'minuto' ? ` · ${fmtTime(e.datetime)}` : e.precision === 'aproximada' ? ' · aprox.' : ''}</span>
                  <span>{PHASE_LABEL[e.phase]}</span>
                  <CertaintyBadge c={e.certainty} />
                </div>
                <div className="what">{e.titulo}<SourceRefs ids={e.sourceIds} /></div>
                {selectedId === e.id && (
                  <>
                    <div className="detail">{e.detalle}</div>
                    {e.nota && <div className="detail muted">Nota: {e.nota}</div>}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
