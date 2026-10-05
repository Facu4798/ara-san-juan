/** Diferencias entre fuentes, registradas en lugar de ocultarlas. */
export interface Discrepancy {
  dato: string;
  valores: { valor: string; sourceId: string }[];
  decision: string;
}

export const discrepancies: Discrepancy[] = [
  {
    dato: 'Hora de la última comunicación',
    valores: [
      { valor: '07:19 (llamada satelital)', sourceId: 'infobae2026requerimiento' },
      { valor: 'SITREP retransmitido en un parte del COFS fechado 08:52; explosión "unas tres horas después del último mensaje"', sourceId: 'infobae2017mensaje' },
    ],
    decision: 'Se usa 07:19. Parte de la prensa de 2017 citó 07:30; no se verificó en documento primario y no se usa.',
  },
  {
    dato: 'Salida de Ushuaia',
    valores: [
      { valor: '8/11/2017 hacia el área de patrulla', sourceId: 'infobae2026requerimiento' },
      { valor: '"Partieron el lunes 13 de Ushuaia"', sourceId: 'infobae2017tripulantes' },
    ],
    decision: 'Se usa 8/11. No se dibuja recorrido.',
  },
  {
    dato: 'Profundidad del hallazgo',
    valores: [
      { valor: '≈ 800 m (aviso preliminar del POI 24)', sourceId: 'armadaPartes2018' },
      { valor: '907 m (casco resistente)', sourceId: 'armadaGacetilla1711' },
      { valor: '920 m ("ravine in 920m of water")', sourceId: 'oceanInfinity2018hallazgo' },
      { valor: '−910 m (celda GEBCO en la coordenada publicada)', sourceId: 'gebco2020' },
    ],
    decision: 'Se usa 907 m (oficial, medición sobre el casco). 800 m se muestra como estimación preliminar.',
  },
  {
    dato: 'Distancia a la costa',
    valores: [
      { valor: '~500 km de la costa de Comodoro Rivadavia', sourceId: 'mindef2018' },
      { valor: '~600 km al este de Comodoro Rivadavia', sourceId: 'oceanInfinity2018hallazgo' },
    ],
    decision: 'No se usa como cifra protagonista: depende del punto de referencia (costa o ciudad).',
  },
  {
    dato: 'Distancia entre la estimación CTBTO y el hallazgo',
    valores: [
      { valor: '20 km (cálculo propio con coordenadas publicadas)', sourceId: 'lanacion2018coordenada' },
      { valor: '"muy próxima a la anomalía hidroacústica"', sourceId: 'armadaGacetilla1711' },
    ],
    decision: 'Se muestra el cálculo, identificado como tal.',
  },
  {
    dato: 'Nombre de un tripulante',
    valores: [
      { valor: 'Fabricio Alejandro Alcaraz Coria', sourceId: 'decreto212' },
      { valor: 'Federico Alejandro Alcaraz Coria', sourceId: 'infobae2017tripulantes' },
    ],
    decision: 'Prevalece el decreto (fuente oficial).',
  },
];
