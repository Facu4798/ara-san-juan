import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import type { TimelineEvent } from '../data/types';
import { searchVesselPositions } from '../data/positions';

interface Props {
  events: TimelineEvent[];
  width: number;
  range: [number, number] | null;
  onRange: (r: [number, number] | null) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Escala temporal POR TRAMOS (declarada): comprime meses y expande las horas críticas. */
export const TIME_BREAKS = [
  Date.parse('2017-10-20T00:00:00-03:00'),
  Date.parse('2017-11-14T22:00:00-03:00'),
  Date.parse('2017-11-15T12:00:00-03:00'),
  Date.parse('2018-11-20T00:00:00-03:00'),
  Date.parse('2020-03-15T00:00:00-03:00'),
];
const SEGMENTS = ['Misión', '14–15 nov. 2017 (horas)', 'Búsqueda (meses)', 'Después'];
const FRACTIONS = [0, 0.14, 0.52, 0.88, 1];
const H = 96;

export function TimeBrush({ events, width, range, onRange, selectedId, onSelect }: Props) {
  const gRef = useRef<SVGGElement | null>(null);
  const m = 10;
  const x = useMemo(
    () => d3.scaleLinear().domain(TIME_BREAKS).range(FRACTIONS.map((f) => m + f * (width - 2 * m))).clamp(true),
    [width],
  );

  useEffect(() => {
    if (!gRef.current || width < 50) return;
    const brush = d3
      .brushX()
      .extent([[m, 14], [width - m, H - 20]])
      .on('end', (ev: d3.D3BrushEvent<unknown>) => {
        if (!ev.sourceEvent) return;
        const sel = ev.selection as [number, number] | null;
        onRange(sel ? [x.invert(sel[0]), x.invert(sel[1])] : null);
      });
    const g = d3.select(gRef.current);
    g.call(brush);
    if (range) g.call(brush.move, [x(range[0]), x(range[1])]);
    else g.call(brush.move, null);
    g.selectAll('.selection').attr('fill', 'rgba(124,196,216,0.12)').attr('stroke', 'rgba(124,196,216,0.6)');
    return () => {
      g.on('.brush', null);
    };
  }, [x, width, range, onRange]);

  if (width < 50) return null;

  return (
    <svg width={width} height={H} role="group" aria-label="Línea de tiempo con escala por tramos. Arrastrar para filtrar por período.">
      {SEGMENTS.map((s, i) => {
        const x0 = x(TIME_BREAKS[i]), x1 = x(TIME_BREAKS[i + 1]);
        return (
          <g key={s}>
            <rect x={x0} y={14} width={x1 - x0} height={H - 34} fill={i % 2 ? 'rgba(221,228,232,0.025)' : 'transparent'} />
            {i > 0 && <line x1={x0} x2={x0} y1={8} y2={H - 14} stroke="var(--faint)" strokeDasharray="2 3" />}
            <text x={x0 + 4} y={10} fontSize={12} fill="var(--muted)" fontFamily="IBM Plex Mono, monospace">{s}</text>
          </g>
        );
      })}
      {searchVesselPositions.map((p) => (
        <rect key={p.id} x={x(Date.parse(p.datetime!)) - 1} y={H - 30} width={2} height={6} fill="var(--busqueda)" />
      ))}
      <g ref={gRef} />
      {events.map((e) => {
        const cx = x(Date.parse(e.datetime));
        const color = e.certainty === 'hecho' ? 'var(--hecho)' : e.certainty === 'estimacion' ? 'var(--estimacion)' : 'var(--hipotesis)';
        const sel = selectedId === e.id;
        return (
          <g key={e.id} transform={`translate(${cx},${H / 2 - 4})`} style={{ cursor: 'pointer' }} onClick={() => onSelect(e.id)}>
            <title>{e.titulo}</title>
            <line y1={-14} y2={14} stroke={color} strokeWidth={sel ? 2.5 : 1} opacity={e.sinRespuesta ? 0.45 : 0.9} />
            {sel && <circle r={5} fill="none" stroke="var(--estimacion)" />}
          </g>
        );
      })}
      <text x={width - m} y={H - 2} fontSize={12} textAnchor="end" fill="var(--muted)" fontFamily="IBM Plex Mono, monospace">
        escala por tramos · cuadrados: partes del buque de búsqueda
      </text>
    </svg>
  );
}
