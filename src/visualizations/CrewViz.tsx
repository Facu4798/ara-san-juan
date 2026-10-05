import { useMemo } from 'react';
import type { CrewMember } from '../data/types';
import { RANK_ORDER, OFFICER_RANKS } from '../data/crew';
import { SUBMARINE } from '../data/depth';
import { useSize } from '../utils/useScrollSection';

export type CrewMode = 'casco' | 'grado' | 'provincia' | 'edad';

interface Props {
  crew: CrewMember[];
  mode: CrewMode;
  selected: number | null;
  onSelect: (orden: number) => void;
}

/** Sistema de coordenadas lógico: 1000 unidades de ancho; se escala al contenedor. */
const W = 1000;
const MARK_W = 12;
const MARK_H = 30;

interface Layout {
  pos: Map<number, { x: number; y: number }>;
  height: number;
  labels: { x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end' }[];
  hull?: { x: number; y: number; w: number; h: number };
}

function layout(crew: CrewMember[], mode: CrewMode): Layout {
  const pos = new Map<number, { x: number; y: number }>();
  const labels: Layout['labels'] = [];

  if (mode === 'casco') {
    const hullW = 900;
    const hullH = (hullW * SUBMARINE.cascoResistenteAnchoM) / SUBMARINE.esloraM;
    const hx = (W - hullW) / 2, hy = 40;
    const perRow = 22;
    const gap = (hullW - 80) / perRow;
    const rowsH = 2 * MARK_H + 8;
    crew.forEach((c, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      pos.set(c.orden, { x: hx + 40 + col * gap + gap / 2 - MARK_W / 2, y: hy + (hullH - rowsH) / 2 + row * (MARK_H + 8) });
    });
    labels.push({ x: hx, y: hy + hullH + 34, text: `ESLORA ${String(SUBMARINE.esloraM).replace('.', ',')} M · ORDEN DEL DECRETO 212/2020 · NO REPRESENTA LA UBICACIÓN A BORDO` });
    return { pos, height: hy + hullH + 60, labels, hull: { x: hx, y: hy, w: hullW, h: hullH } };
  }

  if (mode === 'grado') {
    const groups: [string, CrewMember[]][] = [
      ['Oficiales', crew.filter((c) => OFFICER_RANKS.has(c.gradoDecreto as (typeof RANK_ORDER)[number]))],
      ['Suboficiales', crew.filter((c) => !OFFICER_RANKS.has(c.gradoDecreto as (typeof RANK_ORDER)[number]))],
    ];
    const colW = W / groups.length;
    let maxRows = 0;
    groups.forEach(([k, members], gi) => {
      const perCol = Math.max(1, Math.floor((colW - 8) / (MARK_W + 5)));
      members.forEach((c, i) => {
        const r = Math.floor(i / perCol);
        maxRows = Math.max(maxRows, r + 1);
        pos.set(c.orden, { x: gi * colW + 4 + (i % perCol) * (MARK_W + 5), y: 40 + r * (MARK_H + 8) });
      });
      labels.push({ x: gi * colW + 4, y: 26, text: `${k.toUpperCase()} (${members.length})` });
    });
    return { pos, height: 60 + maxRows * (MARK_H + 8), labels };
  }

  if (mode === 'provincia') {
    const counts = new Map<string, number>();
    crew.forEach((c) => c.provincia && counts.set(c.provincia, (counts.get(c.provincia) ?? 0) + 1));
    const rows = [...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k), 'Sin dato publicado'];
    rows.forEach((k, ri) => {
      const members = crew.filter((c) => (c.provincia ?? 'Sin dato publicado') === k);
      labels.push({ x: 250, y: 30 + ri * (MARK_H + 10) + MARK_H / 2 + 4, text: `${k} (${members.length})`, anchor: 'end' });
      members.forEach((c, i) => pos.set(c.orden, { x: 270 + i * (MARK_W + 5), y: 30 + ri * (MARK_H + 10) }));
    });
    return { pos, height: 40 + rows.length * (MARK_H + 10), labels };
  }

  // edad: posición horizontal = edad publicada; apilado por coincidencias
  const x = (age: number) => 120 + ((age - 25) / (50 - 25)) * (W - 160);
  const stack = new Map<number, number>();
  const baseY = 260;
  crew.forEach((c) => {
    if (c.edad == null) return;
    const n = stack.get(c.edad) ?? 0;
    stack.set(c.edad, n + 1);
    pos.set(c.orden, { x: x(c.edad) - MARK_W / 2, y: baseY - (n + 1) * (MARK_H + 4) });
  });
  const unknown = crew.filter((c) => c.edad == null);
  unknown.forEach((c, i) => pos.set(c.orden, { x: 120 + i * (MARK_W + 5), y: baseY + 70 }));
  for (let a = 25; a <= 50; a += 5) labels.push({ x: x(a), y: baseY + 24, text: `${a}`, anchor: 'middle' });
  labels.push({ x: 120, y: baseY + 44, text: 'EDAD PUBLICADA (AÑOS)' });
  labels.push({ x: 120, y: baseY + 60, text: `SIN EDAD PUBLICADA (${unknown.length})` });
  return { pos, height: baseY + 120, labels };
}

/**
 * Marcas como botones HTML sobre un SVG de fondo (casco y rótulos).
 * Las transiciones de transform en HTML son fiables en todos los navegadores;
 * en elementos <g> de SVG no lo son.
 */
export function CrewViz({ crew, mode, selected, onSelect }: Props) {
  const l = useMemo(() => layout(crew, mode), [crew, mode]);
  const { ref, width } = useSize<HTMLDivElement>();
  const s = width / W;

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Los 44 tripulantes. Cada marca es una persona; seleccionar para ver su información documentada."
      style={{ position: 'relative', width: '100%', height: l.height * s, transition: 'height 500ms ease' }}
    >
      <svg viewBox={`0 0 ${W} ${l.height}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} aria-hidden="true">
        {l.hull && <rect x={l.hull.x} y={l.hull.y} width={l.hull.w} height={l.hull.h} rx={l.hull.h / 2} fill="none" stroke="var(--line)" strokeWidth={1.5} />}
        {l.labels.map((lb, i) => (
          <text key={i} x={lb.x} y={lb.y} textAnchor={lb.anchor ?? 'start'} fontSize={13} fill="var(--muted)" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.06em">
            {lb.text}
          </text>
        ))}
      </svg>
      {width > 0 &&
        crew.map((c) => {
          const p = l.pos.get(c.orden)!;
          const isSel = selected === c.orden;
          return (
            <button
              key={c.orden}
              type="button"
              className="crew-mark"
              aria-pressed={isSel}
              aria-label={`${c.gradoDecreto} ${c.nombreCompleto}`}
              title={`${c.gradoDecreto} ${c.nombreCompleto}`}
              onClick={() => onSelect(c.orden)}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: Math.max(6, MARK_W * s),
                height: Math.max(14, MARK_H * s),
                padding: 0,
                border: 0,
                borderRadius: 2,
                cursor: 'pointer',
                background: isSel ? 'var(--estimacion)' : 'var(--hecho)',
                opacity: isSel ? 1 : 0.85,
                transform: `translate3d(${p.x * s}px, ${p.y * s}px, 0)`,
                transition: 'transform 700ms cubic-bezier(.2,.7,.2,1), background 200ms',
              }}
            />
          );
        })}
    </div>
  );
}
