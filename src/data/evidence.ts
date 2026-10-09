import type { EvidenceItem } from './types';

/**
 * Evidencia documental que se muestra dentro del relato.
 * Los textos son literales de la fuente citada. Los archivos viven en public/.
 *
 * Audio: no se encontró ninguna grabación publicada del reporte del ingreso de agua
 * (fue un mensaje escrito). La única grabación conocida del comandante es de abril de 2017
 * y no se usa (ver fuente infobae2026audio). Si apareciera un audio con fuente verificable,
 * se agrega en public/evidencia/evidencia.json sin tocar el código.
 */
export const evidence: EvidenceItem[] = [
  {
    id: 'foto-2017',
    beatId: 'contexto',
    tipo: 'imagen',
    titulo: 'El ARA San Juan en el Apostadero Naval de Buenos Aires',
    fecha: '14 de mayo de 2017',
    archivo: 'evidencia/ara-san-juan-2017.jpg',
    credito: 'Foto: Juan Kulichevsky · CC BY-SA 2.0 · Wikimedia Commons',
    sourceIds: ['commonsSanJuan2017'],
  },
  {
    id: 'sitrep-0600',
    beatId: 'c0600',
    tipo: 'documento',
    titulo: 'SITREP del ARA San Juan',
    fecha: '15/11/2017 · 06:00',
    texto:
      'Ingreso de agua de mar por sistema de ventilación al tanque de baterías N.º 3. Ocasionó cortocircuito y principio de incendio en el balcón de barras de baterías. Baterías de proa fuera de servicio. Al momento en inmersión propulsando con circuito dividido. Sin novedades de personal. Mantendré informado.',
    sourceIds: ['infobae2026requerimiento'],
    nota: 'Mensaje escrito, citado en el requerimiento fiscal. No se conoce una grabación de voz de este reporte.',
  },
];

export const evidenceForBeat = (beatId: string) => evidence.filter((e) => e.beatId === beatId);

/** Entrada de audio opcional, declarada en public/evidencia/evidencia.json. */
export interface AudioEvidence {
  beatId: string;
  archivo: string;
  titulo: string;
  fecha: string;
  fuente: string;
  transcripcion?: string;
  licencia?: string;
}
