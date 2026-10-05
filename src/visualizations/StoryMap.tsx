import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import type { GeoData } from '../utils/loadData';
import type { Grid, Position } from '../data/types';
import { POS_0028, POS_CTBTO, POS_HALLAZGO, referencePlaces, searchVesselPositions, HYPOTHESIS_SPEED } from '../data/positions';
import { distanceKm } from '../utils/geo';
import { fmt0, fmtDate } from '../utils/format';
import type { BBox } from '../scenes/storySteps';

export interface MapLayers {
  refs?: boolean;
  p0028?: 'crisp' | 'aged' | 'faint';
  ctbto?: 'on' | 'faint';
  hypothesisHours?: number;
  /** Rango de posiciones del buque de búsqueda (epoch ms). */
  secoRange?: [number, number];
  secoHighlight?: string;
  wreck?: boolean;
  distances?: boolean;
  dim?: boolean;
  headingDeg?: number;
  selectedId?: string;
  onSelect?: (p: Position) => void;
}

interface Props {
  geo: GeoData;
  bbox: BBox;
  width: number;
  height: number;
  layers: MapLayers;
  title: string;
}

type RawRing = [number, number][];
interface ContourSet { value: number; rings: RawRing[] }

/** Isóbatas en coordenadas de grilla (se transforman al dibujar). */
function gridContours(g: Grid, thresholds: number[]): ContourSet[] {
  const gen = d3.contours().size([g.cols, g.rows]).thresholds(thresholds);
  return gen(g.elevation).map((mp) => ({
    value: mp.value,
    rings: mp.coordinates.flatMap((poly) => poly.map((ring) => ring as RawRing)),
  }));
}

const REGION: [number, number, number, number] = [-82, -66, -38, -24];

function regionLand(land: Feature<Geometry> | FeatureCollection<Geometry>): FeatureCollection<Polygon> {
  const feats = 'features' in land ? land.features : [land];
  const polys: Feature<Polygon>[] = [];
  for (const f of feats) {
    const geom = f.geometry;
    const list = geom.type === 'MultiPolygon' ? (geom as MultiPolygon).coordinates : geom.type === 'Polygon' ? [(geom as Polygon).coordinates] : [];
    for (const coords of list) {
      const poly: Polygon = { type: 'Polygon', coordinates: coords };
      const [[w, s], [e, n]] = d3.geoBounds(poly);
      if (e >= REGION[0] && w <= REGION[2] && n >= REGION[1] && s <= REGION[3]) {
        polys.push({ type: 'Feature', properties: {}, geometry: poly });
      }
    }
  }
  return { type: 'FeatureCollection', features: polys };
}

const NICE_KM = [5, 10, 20, 50, 100, 200, 500, 1000];

export function StoryMap({ geo, bbox, width, height, layers, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const land = useMemo(() => regionLand(geo.land), [geo.land]);
  const shelfContours = useMemo(() => gridContours(geo.shelf, [-5000, -4000, -3000, -2000, -1000, -200]), [geo.shelf]);
  const regionalContours = useMemo(
    () => gridContours(geo.regional, d3.range(-3000, 0, 100)),
    [geo.regional],
  );

  const projection = useMemo(() => {
    const pad = Math.min(width, height) * 0.06;
    return d3.geoMercator().fitExtent(
      [[pad, pad], [Math.max(pad + 1, width - pad), Math.max(pad + 1, height - pad)]],
      { type: 'MultiPoint', coordinates: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]] },
    );
  }, [bbox, width, height]);

  // ——— Capa base en canvas: graticula, isóbatas GEBCO, costa ———
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const path = d3.geoPath(projection, ctx);
    const dimK = layers.dim ? 0.45 : 1;

    ctx.beginPath();
    path(d3.geoGraticule().step([2, 2])());
    ctx.strokeStyle = `rgba(221,228,232,${0.045 * dimK})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    const drawContours = (sets: ContourSet[], g: Grid, style: (v: number) => [string, number]) => {
      const dLat = g.lats[1] - g.lats[0];
      const dLon = g.lons[1] - g.lons[0];
      const onBorder = (x: number, y: number) => x <= 0 || y <= 0 || x >= g.cols || y >= g.rows;
      for (const set of sets) {
        const [color, lw] = style(set.value);
        ctx.beginPath();
        for (const ring of set.rings) {
          let pen = false;
          for (let i = 0; i < ring.length; i++) {
            const [x, y] = ring[i];
            const prev = ring[i - 1];
            const skip = prev && onBorder(x, y) && onBorder(prev[0], prev[1]);
            const p = projection([g.lons[0] + (x - 0.5) * dLon, g.lats[0] + (y - 0.5) * dLat]);
            if (!p) continue;
            if (!pen || skip) ctx.moveTo(p[0], p[1]);
            else ctx.lineTo(p[0], p[1]);
            pen = true;
          }
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    };

    const bboxWidth = bbox[2] - bbox[0];
    // La grilla de plataforma (0,25°) se atenúa al acercarse: la regional (0,04°) la reemplaza.
    const shelfA = Math.max(0, Math.min(1, (bboxWidth - 4) / 5));
    if (shelfA > 0) {
      drawContours(shelfContours, geo.shelf, (v) =>
        v === -200 ? [`rgba(124,196,216,${0.32 * dimK * shelfA})`, 1] : [`rgba(124,196,216,${0.12 * dimK * shelfA})`, 0.8],
      );
    }
    if (bboxWidth < 9) {
      const a = Math.max(0, Math.min(1, (9 - bboxWidth) / 4));
      drawContours(regionalContours, geo.regional, (v) =>
        v % 500 === 0 ? [`rgba(124,196,216,${0.2 * a * dimK})`, 0.9] : [`rgba(124,196,216,${0.07 * a * dimK})`, 0.6],
      );
    }

    ctx.beginPath();
    path(land);
    ctx.fillStyle = '#0b1217';
    ctx.fill();
    ctx.strokeStyle = `rgba(221,228,232,${0.38 * dimK})`;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }, [projection, width, height, land, shelfContours, regionalContours, geo.shelf, geo.regional, bbox, layers.dim]);

  const svgPath = useMemo(() => d3.geoPath(projection), [projection]);
  const pr = (p: { lat: number; lon: number }) => projection([p.lon, p.lat]) ?? [-999, -999];

  // Escala gráfica
  const scaleBar = useMemo(() => {
    if (!width) return null;
    const cx = width / 2, cy = height / 2;
    const a = projection.invert?.([cx, cy]);
    const b = projection.invert?.([cx + 100, cy]);
    if (!a || !b) return null;
    const kmPerPx = distanceKm({ lon: a[0], lat: a[1] }, { lon: b[0], lat: b[1] }) / 100;
    const km = NICE_KM.find((k) => k / kmPerPx >= 70) ?? 1000;
    return { km, px: km / kmPerPx };
  }, [projection, width, height]);

  const hyp = layers.hypothesisHours != null && layers.hypothesisHours > 0
    ? (() => {
        const km = layers.hypothesisHours * HYPOTHESIS_SPEED.kmPorHora;
        const circle = d3.geoCircle().center([POS_0028.lon, POS_0028.lat]).radius(km / 111.195)();
        return { km, d: svgPath(circle) ?? '' };
      })()
    : null;

  const seco = layers.secoRange
    ? searchVesselPositions.filter((p) => {
        const t = Date.parse(p.datetime!);
        return t >= layers.secoRange![0] && t <= layers.secoRange![1];
      })
    : [];

  const p0 = pr(POS_0028), pc = pr(POS_CTBTO), pw = pr(POS_HALLAZGO);
  const sel = (p: Position) => layers.selectedId === p.id;
  const clickable = (p: Position) =>
    layers.onSelect
      ? { role: 'button', tabIndex: 0, style: { cursor: 'pointer' }, onClick: () => layers.onSelect!(p), onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && layers.onSelect!(p) }
      : {};

  return (
    <div className="map-wrap">
      <canvas ref={canvasRef} aria-hidden="true" />
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <defs>
          <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="#d4a85a" strokeWidth="1.2" strokeOpacity="0.4" />
          </pattern>
          <filter id="soft" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {layers.refs &&
          referencePlaces.map((p) => {
            const [x, y] = pr(p);
            return (
              <g key={p.id} transform={`translate(${x},${y})`} {...clickable(p)}>
                <title>{`${p.label}. ${p.nota ?? ''}`}</title>
                <rect x={-3} y={-3} width={6} height={6} fill="none" stroke="var(--ink-2)" strokeWidth={1} />
                <text className="map-label" x={9} y={4}>{p.label}</text>
              </g>
            );
          })}

        {hyp && (
          <g aria-label="Hipótesis de alcance">
            <path d={hyp.d} fill="url(#hatch)" stroke="var(--hipotesis)" strokeDasharray="4 4" strokeWidth={1} />
            <text className="map-label" x={p0[0]} y={p0[1] - (hyp.km / (scaleBar ? scaleBar.km / scaleBar.px : 1)) - 8} textAnchor="middle" style={{ fill: 'var(--hipotesis)' }}>
              HIPÓTESIS · {HYPOTHESIS_SPEED.nudos} nudos × {layers.hypothesisHours!.toFixed(1).replace('.', ',')} h = {fmt0(hyp.km)} km
            </text>
          </g>
        )}

        {seco.map((p, i) => {
          const [x, y] = pr(p);
          const hi = layers.secoHighlight === p.id || sel(p);
          const recency = seco.length > 1 ? 0.35 + 0.65 * (i / (seco.length - 1)) : 1;
          return (
            <g key={p.id} transform={`translate(${x},${y})`} {...clickable(p)}>
              <title>{`${p.label} · ${fmtDate(p.datetime!)} · ${p.textoFuente}`}</title>
              <rect x={hi ? -4.5 : -2.5} y={hi ? -4.5 : -2.5} width={hi ? 9 : 5} height={hi ? 9 : 5} fill="var(--busqueda)" opacity={hi ? 1 : recency} stroke={hi ? 'var(--ink)' : 'none'} />
              {hi && (
                <text className="map-label" x={x > width - 340 ? -10 : 10} y={x > width - 340 ? 22 : 4} textAnchor={x > width - 340 ? 'end' : 'start'}>
                  {`Seabed Constructor · ${fmtDate(p.datetime!)}`}
                </text>
              )}
            </g>
          );
        })}
        {seco.length > 0 && !layers.secoHighlight && (() => {
          const last = seco[seco.length - 1];
          const [x, y] = pr(last);
          return <text className="map-label small" x={x + 8} y={y - 8}>{fmtDate(last.datetime!)}</text>;
        })()}

        {layers.distances && layers.wreck && (
          <g>
            <line x1={pw[0]} y1={pw[1]} x2={p0[0]} y2={p0[1]} stroke="var(--hecho)" strokeOpacity={0.5} strokeDasharray="2 4" />
            <text className="map-label" x={(pw[0] + p0[0]) / 2 + 10} y={(pw[1] + p0[1]) / 2}>{fmt0(distanceKm(POS_HALLAZGO, POS_0028))} km</text>
            <line x1={pw[0]} y1={pw[1]} x2={pc[0]} y2={pc[1]} stroke="var(--estimacion)" strokeOpacity={0.6} strokeDasharray="2 4" />
            <text className="map-label" x={(pw[0] + pc[0]) / 2 + 10} y={(pw[1] + pc[1]) / 2 - 4} style={{ fill: 'var(--estimacion)' }}>{fmt0(distanceKm(POS_HALLAZGO, POS_CTBTO))} km</text>
          </g>
        )}

        {layers.p0028 && (
          <g transform={`translate(${p0[0]},${p0[1]})`} opacity={layers.p0028 === 'faint' ? 0.4 : 1} {...clickable(POS_0028)}>
            <title>{`${POS_0028.label} · 15/11/2017 00:28 · ${POS_0028.textoFuente}`}</title>
            {layers.p0028 === 'crisp' ? (
              <>
                <circle r={11} fill="none" stroke="var(--hecho)" strokeOpacity={0.25} />
                <circle r={4.5} fill="var(--hecho)" />
              </>
            ) : (
              <circle r={4.5} fill="none" stroke="var(--hecho)" strokeWidth={1.5} />
            )}
            {sel(POS_0028) && <circle r={16} fill="none" stroke="var(--estimacion)" />}
            <text className="map-label" x={12} y={16}>00:28 · 46°44′ S 60°08′ O</text>
          </g>
        )}

        {layers.ctbto && (
          <g transform={`translate(${pc[0]},${pc[1]})`} opacity={layers.ctbto === 'faint' ? 0.4 : 1} {...clickable(POS_CTBTO)}>
            <title>{`${POS_CTBTO.label} · 10:51 · ${POS_CTBTO.nota}`}</title>
            <circle r={9} fill="none" stroke="var(--estimacion)" strokeWidth={2} filter="url(#soft)" />
            <circle r={6} fill="none" stroke="var(--estimacion)" strokeWidth={1.2} strokeDasharray="2 2" />
            {sel(POS_CTBTO) && <circle r={16} fill="none" stroke="var(--estimacion)" />}
            <text className="map-label" x={12} y={-8} style={{ fill: 'var(--estimacion)' }}>10:51 · estimación CTBTO</text>
          </g>
        )}

        {layers.wreck && (
          <g transform={`translate(${pw[0]},${pw[1]})`} {...clickable(POS_HALLAZGO)}>
            <title>{`${POS_HALLAZGO.label} · ${POS_HALLAZGO.textoFuente} · 907 m`}</title>
            <circle r={14} fill="none" stroke="var(--hecho)" strokeOpacity={0.35} />
            <path d="M-6 0 H6 M0 -6 V6" stroke="var(--hecho)" strokeWidth={1.5} />
            <circle r={2.5} fill="var(--hecho)" />
            {sel(POS_HALLAZGO) && <circle r={20} fill="none" stroke="var(--estimacion)" />}
            <text className="map-label" x={16} y={-10}>17/11/2018 · 907 m</text>
          </g>
        )}

        {layers.headingDeg != null && (
          <g transform={`translate(${Math.max(60, width * 0.5)},${height - 70})`} aria-label={`Rumbo documentado ${layers.headingDeg} grados`}>
            <circle r={26} fill="none" stroke="var(--line)" />
            <text className="map-label small" y={-32} textAnchor="middle">N</text>
            <g transform={`rotate(${layers.headingDeg})`}>
              <path d="M0 18 L0 -22 M-5 -14 L0 -22 L5 -14" stroke="var(--hecho)" strokeWidth={1.5} fill="none" />
            </g>
            <text className="map-label small" y={46} textAnchor="middle">rumbo {String(layers.headingDeg).padStart(3, '0')}° · sin posición</text>
          </g>
        )}

        {scaleBar && (
          <g transform={`translate(${Math.max(16, width * 0.04)},${height - 24})`}>
            <line x1={0} x2={scaleBar.px} y1={0} y2={0} stroke="var(--ink-2)" />
            <line x1={0} x2={0} y1={-4} y2={4} stroke="var(--ink-2)" />
            <line x1={scaleBar.px} x2={scaleBar.px} y1={-4} y2={4} stroke="var(--ink-2)" />
            <text className="map-label small" x={scaleBar.px + 8} y={4}>{scaleBar.km} km</text>
          </g>
        )}
      </svg>
    </div>
  );
}
