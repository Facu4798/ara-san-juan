import type { TimelineEvent } from './types';

/**
 * Cronología. Horas en hora oficial argentina (UTC−3).
 * Sólo se incluyen eventos con fuente. Las discrepancias entre fuentes se anotan en `nota`.
 */
const REQ = 'infobae2026requerimiento';

export const events: TimelineEvent[] = [
  // ——— MISIÓN ———
  {
    id: 'orden-operaciones', datetime: '2017-10-24T12:00:00-03:00', precision: 'dia', phase: 'mision',
    titulo: 'Orden de Operaciones COFS N.º 04/17',
    detalle: 'Firmada por el Comando de la Fuerza de Submarinos. Finalidad: alistamiento y adiestramiento mediante ejercicios navales, patrullaje y control del mar.',
    certainty: 'hecho', sourceIds: [REQ],
  },
  {
    id: 'zarpe-mdp', datetime: '2017-10-25T12:00:00-03:00', precision: 'dia', phase: 'mision',
    titulo: 'Zarpa de Mar del Plata', detalle: 'Inicio de la última misión.', certainty: 'hecho', sourceIds: [REQ], positionId: 'mar-del-plata',
  },
  {
    id: 'arribo-ushuaia', datetime: '2017-11-04T12:00:00-03:00', precision: 'dia', phase: 'mision',
    titulo: 'Arriba a Ushuaia', detalle: 'Luego navega el Canal de Beagle con ejercicios tácticos.', certainty: 'hecho', sourceIds: [REQ], positionId: 'ushuaia',
  },
  {
    id: 'zarpe-ushuaia', datetime: '2017-11-08T12:00:00-03:00', precision: 'dia', phase: 'mision',
    titulo: 'Sale hacia su área de patrulla',
    detalle: 'Entre el 10 y el 11 participa de maniobras con unidades de la flota; luego inicia la patrulla en la zona denominada "Juliana".',
    certainty: 'hecho', sourceIds: [REQ, 'infobae2017tripulantes'],
    nota: 'Infobae (30/11/2017) indica que partieron de Ushuaia el lunes 13. Se prioriza el requerimiento fiscal. El recorrido entre Ushuaia y la posición del 15/11 no está publicado: sólo se dibuja un trazado esquemático, rotulado como tal.',
  },

  // ——— ÚLTIMAS HORAS ———
  {
    id: 'c2342', datetime: '2017-11-14T23:42:00-03:00', precision: 'minuto', phase: 'ultimas-horas',
    titulo: 'Llamada satelital: "principio de incendio controlado"',
    detalle: 'El jefe de Operaciones informa que el buque está en superficie, ventilando. "Cortocircuito en balcón barra de baterías". Rumbo 080° a 5 nudos, "capeando temporal".',
    certainty: 'hecho', sourceIds: [REQ], profundidadM: 0,
  },
  {
    id: 'c0028', datetime: '2017-11-15T00:28:00-03:00', precision: 'minuto', phase: 'ultimas-horas',
    titulo: 'Última posición informada: 46°44′ S — 60°08′ O',
    detalle: 'Nueva llamada satelital. "El Sr. Comandante se encuentra en el puente". Posición GPS y "sin novedad" respecto de la tripulación.',
    certainty: 'hecho', sourceIds: [REQ], positionId: 'pos-0028',
    nota: 'Es la única coordenada del submarino publicada para esas horas. La precisión del texto es de 1 minuto de arco (~1,8 km).',
  },
  {
    id: 'c0058', datetime: '2017-11-15T00:58:00-03:00', precision: 'minuto', phase: 'ultimas-horas',
    titulo: 'El comandante de la Fuerza llama al comandante del buque',
    detalle: 'Navegando en superficie. Intención: "cargar aire, regresar a inmersión, volver a conectar las baterías de proa". Orden recibida: "Finalizar la patrulla, regresar a Mar del Plata, enviar SITREP ampliatorio".',
    certainty: 'hecho', sourceIds: [REQ], profundidadM: 0,
  },
  {
    id: 'c0132', datetime: '2017-11-15T01:32:00-03:00', precision: 'minuto', phase: 'ultimas-horas',
    titulo: 'Orden escrita por HF',
    detalle: '"Derrota directa a Mar del Plata / Velocidad a discreción / Inmersión-superficie según factibilidad / Enviar SITREP ampliatorio".',
    certainty: 'hecho', sourceIds: [REQ],
  },
  {
    id: 'c0600', datetime: '2017-11-15T06:00:00-03:00', precision: 'minuto', phase: 'ultimas-horas',
    titulo: 'SITREP: ingreso de agua al tanque de baterías N.º 3',
    detalle: '"Ingreso de agua de mar por sistema de ventilación al tanque de baterías N.º 3. Ocasionó cortocircuito y principio de incendio en el balcón de barras de baterías. Baterías de proa fuera de servicio. Al momento en inmersión propulsando con circuito dividido. Sin novedades de personal. Mantendré informado."',
    certainty: 'hecho', sourceIds: [REQ],
  },
  {
    id: 'c0719', datetime: '2017-11-15T07:19:00-03:00', precision: 'minuto', phase: 'ultimas-horas',
    titulo: 'Última comunicación',
    detalle: 'Por teléfono satelital: navega en plano de periscopio (18 m), rumbo 015°, con intención de descender a plano de seguridad (40 m), descansar y después abrir el tanque de baterías.',
    certainty: 'hecho', sourceIds: [REQ], profundidadM: 18,
    nota: 'No se publicó la posición del submarino en esta comunicación. Parte de la prensa de 2017 citó 07:30 (no verificado en documento primario).',
  },

  // ——— SILENCIO ———
  {
    id: 'c0827', datetime: '2017-11-15T08:27:00-03:00', precision: 'minuto', phase: 'silencio',
    titulo: 'Se ordena aumentar la frecuencia de reportes', detalle: 'Sin respuesta.', certainty: 'hecho', sourceIds: [REQ], sinRespuesta: true,
  },
  {
    id: 'c0935', datetime: '2017-11-15T09:35:00-03:00', precision: 'minuto', phase: 'silencio',
    titulo: 'Se ordena actualizar la situación', detalle: '"Nunca hubo respuesta."', certainty: 'hecho', sourceIds: [REQ], sinRespuesta: true,
  },
  {
    id: 'ctbto', datetime: '2017-11-15T10:51:00-03:00', precision: 'minuto', phase: 'silencio',
    titulo: 'Evento hidroacústico registrado a miles de kilómetros',
    detalle: 'Las estaciones HA10 (Isla Ascensión) y HA04 (Crozet) del CTBTO registran un evento impulsivo submarino (13:51 GMT). Localización estimada: −46,12° / −59,69°.',
    certainty: 'estimacion', sourceIds: ['ctbto2017'], positionId: 'ctbto',
    nota: 'La localización es una estimación por triangulación. El CTBTO la difundió públicamente el 23/11/2017, ocho días después.',
  },
  {
    id: 'ctbto-publicacion', datetime: '2017-11-23T12:00:00-03:00', precision: 'dia', phase: 'busqueda-2017',
    titulo: 'El CTBTO publica la localización del evento', detalle: '"En las cercanías de la última posición conocida del ARA San Juan."', certainty: 'hecho', sourceIds: ['ctbto2017'],
  },

  // ——— BÚSQUEDA 2017–2018 (Armada y cooperación internacional) ———
  {
    id: 'busqueda-internacional', datetime: '2017-11-15T12:00:00-03:00', precision: 'dia', phase: 'busqueda-2017',
    titulo: 'Comienza la búsqueda',
    detalle: 'Participan 18 países, más de 4000 personas, 28 unidades de superficie y 9 aeronaves (cifras agregadas de la Armada).',
    certainty: 'hecho', sourceIds: ['armadaMicrositio2018'],
    nota: 'La Armada no publicó la evolución diaria ni los polígonos de las zonas de búsqueda.',
  },
  {
    id: 'contactos-120', datetime: '2018-03-15T12:00:00-03:00', precision: 'aproximada', phase: 'busqueda-2017',
    titulo: '78 contactos investigados en 120 días',
    detalle: 'Participaron 15 unidades de superficie y medios aeronavales, con apoyo de Brasil, Chile, Estados Unidos, Federación Rusa y Reino Unido.',
    certainty: 'hecho', sourceIds: ['armadaMicrositio2018'],
    nota: 'Fecha aproximada: la fuente habla de "los primeros 120 días de búsqueda" desde el 15/11/2017.',
  },
  {
    id: 'licitacion', datetime: '2018-07-21T12:00:00-03:00', precision: 'dia', phase: 'busqueda-2018',
    titulo: 'Se publica la licitación internacional',
    detalle: 'Principio "no cure, no pay". Ocean Infinity cotizó USD 7,5 millones. Plazo: mínimo 60 y máximo 120 días operativos, sin límite de área.',
    certainty: 'hecho', sourceIds: ['armadaMicrositio2018'],
  },
  {
    id: 'transferencia-17', datetime: '2018-08-22T12:00:00-03:00', precision: 'dia', phase: 'busqueda-2018',
    titulo: '17 puntos pendientes se entregan a Ocean Infinity',
    detalle: 'La Armada transfiere la experiencia de la búsqueda, los contactos ya investigados y 17 por investigar.',
    certainty: 'hecho', sourceIds: ['armadaMicrositio2018'],
  },
  {
    id: 'seco-zarpa', datetime: '2018-09-07T12:00:00-03:00', precision: 'dia', phase: 'busqueda-2018',
    titulo: 'El Seabed Constructor zarpa de Comodoro Rivadavia', detalle: 'A bordo: 3 observadores de la Armada y 4 familiares veedores.', certainty: 'hecho', sourceIds: ['armadaMicrositio2018', 'oceanInfinity2018inicio'],
  },
  {
    id: 'primer-auv', datetime: '2018-09-08T19:28:00-03:00', precision: 'minuto', phase: 'busqueda-2018',
    titulo: 'Primer AUV al agua — Sitio 1 / Área 1',
    detalle: 'Lanzamiento del AUV N.º 2 (22:28 UTC). Cinco vehículos autónomos relevan el fondo con sonar.',
    certainty: 'hecho', sourceIds: ['oceanInfinityDSR', 'armadaPartes2018'],
  },
  {
    id: 'poi-1-2', datetime: '2018-09-13T12:00:00-03:00', precision: 'dia', phase: 'busqueda-2018',
    titulo: 'Puntos de interés 1 y 2: descartados', detalle: 'Uno geológico/biológico; el otro, un pesquero registrado.', certainty: 'hecho', sourceIds: ['armadaPartes2018'],
  },
  {
    id: 'poi-3-5', datetime: '2018-09-14T06:00:00-03:00', precision: 'minuto', phase: 'busqueda-2018',
    titulo: 'Puntos 3, 4 y 5: no corresponden al submarino', detalle: 'Investigados con ROV en el área 2.', certainty: 'hecho', sourceIds: ['armadaPartes2018'],
  },
  {
    id: 'poi-8', datetime: '2018-09-17T16:00:00-03:00', precision: 'minuto', phase: 'busqueda-2018',
    titulo: 'Punto 8: formación geológica', detalle: 'Descenso de ROV. Se anuncian ráfagas de hasta 41–47 nudos.', certainty: 'hecho', sourceIds: ['armadaPartes2018'],
  },
  {
    id: 'sitio-2', datetime: '2018-11-14T06:00:00-03:00', precision: 'minuto', phase: 'busqueda-2018',
    titulo: 'El buque deja el Sitio 1 rumbo al Sitio 2',
    detalle: 'Posición: 42°49,7′ S — 58°05,78′ O, unos 370 km al norte del lugar donde sería hallado el submarino (cálculo propio: 372 km).',
    certainty: 'hecho', sourceIds: ['armadaPartes2018'], positionId: 'seco-128',
  },
  {
    id: 'poi-24', datetime: '2018-11-15T22:15:00-03:00', precision: 'minuto', phase: 'hallazgo',
    titulo: 'Punto de interés N.º 24',
    detalle: 'La empresa informa un nuevo punto de interés en el Sitio 1, área 15A-4, "a unos 800 metros de profundidad y 60 m de longitud aproximadamente". El buque vuelve.',
    certainty: 'hecho', sourceIds: ['armadaPartes2018'],
    nota: 'La hora (22:15) figura en el Parte N.º 132, emitido el 16/11/2018 a las 06:00; por eso se ubica la noche del 15/11. La fecha es inferida del orden de los partes.',
  },
  {
    id: 'identificacion', datetime: '2018-11-17T03:00:00-03:00', precision: 'aproximada', phase: 'hallazgo',
    titulo: 'Identificación positiva con ROV',
    detalle: '"En las primeras horas del 17 de noviembre". El casco resistente está en una sola pieza a 907 metros.',
    certainty: 'hecho', sourceIds: ['oceanInfinity2018hallazgo', 'armadaGacetilla1711', 'mindef2018'], positionId: 'hallazgo', profundidadM: 907,
    nota: 'La hora exacta no fue publicada; "primeras horas" (Ocean Infinity). Se ubica a las 03:00 sólo para ordenar la línea de tiempo.',
  },
  {
    id: 'conferencia', datetime: '2018-11-17T12:00:00-03:00', precision: 'dia', phase: 'hallazgo',
    titulo: 'Confirmación oficial: 907 metros',
    detalle: 'Campo de escombros de 80 × 100 m. Cuatro partes visibles: casco central, proa, popa y vela. Zona de cañones, "donde habíamos asignado el 90 % de probabilidad".',
    certainty: 'hecho', sourceIds: ['mindef2018', 'armadaGacetilla1711'],
  },
  {
    id: 'imagenes', datetime: '2018-11-28T21:30:00-03:00', precision: 'minuto', phase: 'hallazgo',
    titulo: '67.000 imágenes y videos',
    detalle: 'Registro de Ocean Infinity entregado a la Justicia. Por pedido de las familias sólo se publicaron las tres imágenes de identificación.',
    certainty: 'hecho', sourceIds: ['armadaMicrositio2018'],
  },

  // ——— POSTERIOR ———
  {
    id: 'bicameral', datetime: '2019-07-18T12:00:00-03:00', precision: 'dia', phase: 'posterior',
    titulo: 'Informe final de la Comisión Bicameral', detalle: 'Presentado públicamente en el Congreso.', certainty: 'hecho', sourceIds: ['bicameral2019'],
  },
  {
    id: 'decreto', datetime: '2020-03-03T12:00:00-03:00', precision: 'dia', phase: 'posterior',
    titulo: 'Ascenso post mortem de los 44', detalle: 'Decreto 212/2020.', certainty: 'hecho', sourceIds: ['decreto212'],
  },
];

export const PHASE_LABEL: Record<TimelineEvent['phase'], string> = {
  mision: 'Misión',
  'ultimas-horas': 'Últimas horas',
  silencio: 'Silencio',
  'busqueda-2017': 'Búsqueda',
  'busqueda-2018': 'Búsqueda científica',
  hallazgo: 'Hallazgo',
  posterior: 'Después',
};
